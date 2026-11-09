// Datos actuales por petición; no generar respuestas de API durante el build.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { OperationError } from '@/lib/transaction';
import { createHash } from 'node:crypto';
import { consumptionConfig, consumptionInclude, consumptionVersion } from '@/lib/consumption-config';
import { calculateConsumption } from '@/lib/inventory-consumption';
import { validateSalePrices } from '@/lib/validate-sale-prices';
import { verifyOfflineAuthorization } from '@/lib/offline-sale-authorization';

/**
 * POST /api/pos/sale
 * Crear una venta real (Burgers o Açaí)
 *
 * Body: {
 *   branchId, userId, paymentMethod, salesChannel?,
 *   cashAmount?, cardAmount?, transferAmount?,
 *   items: [{ productId, quantity, unitPrice, subtotal, modifiers?: [{ modifierId, quantity, price }] }],
 *   discount?: { type: 'PERCENTAGE'|'FIXED', value, authorizedBy? }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER', 'CASHIER']);
        if (access instanceof NextResponse) return access;
        const body = await request.json();
        const {
            branchId,
            userId,
            paymentMethod,
            salesChannel = 'DIRECT',
            cashAmount,
            cardAmount,
            transferAmount,
            items,
            discount,
            extrasTotal = 0,   // monto de extras (modificadores sueltos sin productId real)
            extraModifiers,
            createdAt,         // fecha original si viene de cola offline
            offlineId: rawOfflineId,
        } = body;

        // Validaciones
        if (!branchId || !userId || !paymentMethod) {
            return NextResponse.json(
                { success: false, error: 'branchId, userId y paymentMethod son requeridos' },
                { status: 400 }
            );
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Se requiere al menos un item' },
                { status: 400 }
            );
        }

        if (!access.allowedBranchIds.includes(branchId) || userId !== access.userId) {
            return NextResponse.json({ success: false, error: 'Usuario o sucursal no permitidos' }, { status: 403 });
        }

        if (items.some((item: any) => !item || typeof item.productId !== 'string' ||
            !Number.isFinite(item.quantity) || item.quantity <= 0 ||
            !Number.isFinite(item.unitPrice) || item.unitPrice < 0 ||
            !Number.isFinite(item.subtotal) || item.subtotal < 0 ||
            (item.modifiers !== undefined && !Array.isArray(item.modifiers)))) {
            throw new OperationError('Ítems o cantidades inválidos');
        }
        if (createdAt && !Number.isFinite(Date.parse(createdAt))) throw new OperationError('Fecha de venta inválida');
        if (rawOfflineId !== undefined && (typeof rawOfflineId !== 'string' || !rawOfflineId.trim() || rawOfflineId.length > 128)) {
            throw new OperationError('Identificador offline inválido');
        }
        const offlineId = rawOfflineId?.trim() || null;
        if (offlineId && !createdAt) throw new OperationError('Falta la fecha de la venta offline');
        if (createdAt && !offlineId) throw new OperationError('Falta el identificador de la venta offline');
        const offlinePayloadHash = offlineId ? createHash('sha256').update(JSON.stringify({
            branchId, userId, paymentMethod, salesChannel,
            cashAmount: cashAmount ?? null, cardAmount: cardAmount ?? null, transferAmount: transferAmount ?? null,
            extrasTotal: Number(extrasTotal), ...(extraModifiers !== undefined && { extraModifiers }), createdAt: createdAt ? new Date(createdAt).toISOString() : null,
            items: items.map((item: any) => ({ productId: item.productId, quantity: item.quantity,
                unitPrice: item.unitPrice, subtotal: item.subtotal, ...(item.configVersion !== undefined && { configVersion: item.configVersion }),
                ...(item.consumptionSnapshot !== undefined && { consumptionSnapshot: item.consumptionSnapshot }),
                ...(item.offlineAuthorization !== undefined && { offlineAuthorization: item.offlineAuthorization }),
                ...(item.comboAuthorization !== undefined && { comboAuthorization: item.comboAuthorization }),
                ...(item.comboId !== undefined && { comboId: item.comboId, comboGroup: item.comboGroup }), modifiers: (item.modifiers ?? []).map((m: any) => ({
                    modifierId: m.modifierId, quantity: m.quantity || 1, price: m.price, offlineAuthorization: m.offlineAuthorization,
                })) })),
            discount: discount ? { type: discount.type, value: discount.value, authorizedBy: discount.authorizedBy ?? null } : null,
        })).digest('hex') : null;
        const findReplay = async () => {
            if (!offlineId) return null;
            const previous = await prisma.sale.findUnique({ where: { branchId_offlineId: { branchId, offlineId } } });
            if (previous && previous.offlinePayloadHash !== offlinePayloadHash) {
                throw new OperationError('El identificador offline ya se usó con otros datos', 409);
            }
            return previous;
        };
        const previous = await findReplay();
        if (previous) {
            return NextResponse.json({ success: true, data: { id: previous.id, saleNumber: previous.saleNumber,
                totalAmount: previous.totalAmount, paymentMethod: previous.paymentMethod }, replayed: true });
        }

        // Calcular total (incluye extras sueltos)
        let totalAmount = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
                        + (parseFloat(extrasTotal) || 0);
        const preDiscountTotal = totalAmount;
        let discountAmount = 0;
        if (discount) {
            if (!['PERCENTAGE', 'FIXED'].includes(discount.type) || !Number.isFinite(discount.value) || discount.value < 0 ||
                (discount.type === 'PERCENTAGE' && discount.value > 100) || (discount.type === 'FIXED' && discount.value > totalAmount)) {
                throw new OperationError('Descuento inválido');
            }
            discountAmount = discount.type === 'PERCENTAGE'
                ? totalAmount * (discount.value / 100)
                : discount.value;
            if (discountAmount > preDiscountTotal * 0.15 && !['ADMIN', 'MANAGER'].includes(access.role)) {
                throw new OperationError('Un administrador o encargado debe realizar descuentos mayores al 15%', 403);
            }
            totalAmount -= discountAmount;
        }

        // Ítems que descuentan stock — pre-calculados una sola vez
        const stockItems = items.filter((item: any) => item.unitPrice > 0 || item.subtotal > 0 || item.comboId);
        const uniqueProductIds = [...new Set(items.map((item: any) => item.productId as string))];

        // Validación para MIXED
        if (paymentMethod === 'MIXED') {
            const sumParts = (parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0) + (parseFloat(transferAmount) || 0);
            if (Math.abs(sumParts - totalAmount) > 0.01) {
                return NextResponse.json(
                    { success: false, error: 'La suma de los montos mixtos no coincide con el total de la venta.' },
                    { status: 400 }
                );
            }
        }

        const today = new Date();
        const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ── CREAR VENTA CON REINTENTOS (saleNumber único) ──────────────────
        // Hasta 5 intentos: si hay conflicto de saleNumber (P2002) por concurrencia,
        // re-consulta el último número y vuelve a intentar.
        let sale: any = null;
        let replayed = false;

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const existing = await findReplay();
                if (existing) { sale = existing; replayed = true; break; }
                // Generar número de venta fresco en cada intento
                const lastSale = await prisma.sale.findFirst({
                    where: { saleNumber: { startsWith: `V-${datePrefix}` } },
                    orderBy: { saleNumber: 'desc' },
                    select: { saleNumber: true },
                });
                const seq = lastSale
                    ? parseInt(lastSale.saleNumber.split('-').pop() || '0') + 1
                    : 1;
                const saleNumber = `V-${datePrefix}-${String(seq).padStart(4, '0')}`;

                // Iniciar la transacción
                sale = await prisma.$transaction(async (tx) => {
                    await validateSalePrices(tx, branchId, userId, items, extrasTotal, extraModifiers, Boolean(offlineId), createdAt ? new Date(createdAt) : undefined);
                    const products = await tx.product.findMany({ where: { id: { in: uniqueProductIds } }, include: consumptionInclude });
                    const productMap = new Map(products.map(p => [p.id, p]));
                    const legacyRecipes = await tx.recipe.findMany({
                        where: { productId: { in: products.filter(p => !p.consumptionMode).map(p => p.id) } },
                        include: { ingredients: { include: { ingredient: true } } },
                    });
                    const legacyMap = new Map(legacyRecipes.map(r => [r.productId, r]));
                    const inventoryDeductions: Record<string, { qty: number, name: string }> = {};
                    const add = (id: string, name: string, qty: number) => {
                        if (!inventoryDeductions[id]) inventoryDeductions[id] = { qty: 0, name };
                        inventoryDeductions[id].qty += qty;
                    };
                    for (const item of stockItems) {
                        const product = productMap.get(item.productId);
                        if (!product) throw new OperationError('Producto no encontrado');
                        if (!product.consumptionMode && process.env.REQUIRE_CLASSIFIED_CONSUMPTION === 'true') {
                            throw new OperationError(`Falta configurar la preparación de ${product.name}`, 409);
                        }
                        if (offlineId) {
                            try {
                                const authorization = verifyOfflineAuthorization(item.offlineAuthorization, { kind: 'product', branchId, userId });
                                const config = authorization?.consumptionSnapshot as ReturnType<typeof consumptionConfig>;
                                if (!authorization || authorization.productId !== product.id || !config || item.configVersion !== authorization.configVersion ||
                                    consumptionVersion(config!) !== authorization.configVersion) throw new OperationError(`La autorización offline de ${product.name} no es válida o venció. Requiere conciliación.`, 409);
                                for (const deduction of calculateConsumption([{ product: config, quantity: item.quantity }])) {
                                    add(deduction.productId, deduction.name, deduction.quantity);
                                }
                            } catch (error) {
                                if (error instanceof OperationError) throw error;
                                throw new OperationError(error instanceof Error ? error.message : 'Configuración de consumo inválida');
                            }
                        } else if (product.consumptionMode) {
                            try {
                                const config = consumptionConfig(product)!;
                                for (const deduction of calculateConsumption([{ product: config, quantity: item.quantity }])) {
                                    add(deduction.productId, deduction.name, deduction.quantity);
                                }
                            } catch (error) {
                                if (error instanceof OperationError) throw error;
                                throw new OperationError(error instanceof Error ? error.message : 'Configuración de consumo inválida');
                            }
                        } else {
                            // Compatibilidad transitoria: los productos pendientes de clasificación conservan su comportamiento.
                            const recipe = legacyMap.get(product.id);
                            if (recipe) for (const ingredient of recipe.ingredients) {
                                add(ingredient.ingredientId, ingredient.ingredient.name, ingredient.quantity * item.quantity);
                            } else add(product.id, product.name, item.quantity);
                        }
                    }
                    const idsToDeduct = Object.keys(inventoryDeductions);
                    // Validar stock en la misma transacción que lo descuenta.
                    for (const [id, data] of Object.entries(inventoryDeductions)) {
                        const inv = await tx.inventory.findUnique({ where: { branchId_productId: { branchId, productId: id } } });
                        if (!inv || inv.currentStock < data.qty) {
                            throw new OperationError(`Stock insuficiente para ${data.name}. Solicitado: ${data.qty.toFixed(2)}, Disponible: ${inv?.currentStock ?? 0}${offlineId ? '. La venta offline requiere conciliación' : ''}`, offlineId ? 409 : 400);
                        }
                    }
                    // 1. Crear la Venta (Sale)
                    const newSale = await tx.sale.create({
                        data: {
                            branchId, userId, saleNumber, totalAmount, offlineId, offlinePayloadHash,
                            createdAt: createdAt ? new Date(createdAt) : undefined,
                            paymentMethod: paymentMethod as any,
                            salesChannel: salesChannel as any,
                            cashAmount: cashAmount ?? null,
                            cardAmount: cardAmount ?? null,
                            transferAmount: transferAmount ?? null,
                            items: {
                                create: items.map((item: any) => ({
                                    productId: item.productId,
                                    quantity:  item.quantity,
                                    unitPrice: item.unitPrice,
                                    subtotal:  item.subtotal,
                                    discount:  0,
                                    offlineSnapshot: offlineId ? {
                                        product: verifyOfflineAuthorization(item.offlineAuthorization, { kind: 'product', branchId, userId }),
                                        combo: item.comboAuthorization ? verifyOfflineAuthorization(item.comboAuthorization, { kind: 'combo', branchId, userId }) : null,
                                        modifiers: (item.modifiers || []).map((mod: any) => verifyOfflineAuthorization(mod.offlineAuthorization,
                                            { kind: 'modifier', branchId, userId })),
                                    } as Prisma.InputJsonValue : undefined,
                                    modifiers: item.modifiers?.length
                                        ? { create: item.modifiers.map((mod: any) => ({
                                            modifierId: mod.modifierId,
                                            quantity:   mod.quantity || 1,
                                            price:      mod.price,
                                        })) }
                                        : undefined,
                                })),
                            },
                        },
                        select: { id: true, saleNumber: true, totalAmount: true, paymentMethod: true },
                    });

                    // 2. Descuento
                    if (discount && discountAmount > 0) {
                        await tx.discount.create({
                            data: {
                                saleId: newSale.id,
                                type:   discount.type,
                                value:  discount.value,
                                authorizedBy: ['ADMIN', 'MANAGER'].includes(access.role) ? access.userId : null,
                            },
                        });
                    }

                    // 3. Descontar stock y generar Kardex (Maneja Recetas Dinámicas)
                    if (idsToDeduct.length > 0) {
                        await Promise.all(
                            Object.entries(inventoryDeductions).map(async ([id, data]) => {
                                const qty = data.qty;

                                const inv = await tx.inventory.findUnique({
                                    where: { branchId_productId: { branchId, productId: id } }
                                });

                                if (inv) {
                                    const updated = await tx.inventory.update({
                                        where: { branchId_productId: { branchId, productId: id } },
                                        data: { currentStock: { decrement: qty }, lastUpdated: new Date() },
                                    });

                                    await tx.stockMovement.create({
                                        data: {
                                            branchId,
                                            productId: id,
                                            type: 'SALIDA',
                                            quantity: -qty,
                                            previousStock: inv.currentStock,
                                            newStock: updated.currentStock,
                                            reference: saleNumber,
                                            saleId: newSale.id,
                                            inventoryId: inv.id,
                                            createdBy: userId,
                                            notes: `Venta ${saleNumber} (Receta Dinámica)`,
                                        }
                                    });
                                }
                            })
                        );
                    }

                    return newSale;
                }, { isolationLevel: 'Serializable', timeout: 15000, maxWait: 5000 });

                break; // ← Éxito, salir del loop

            } catch (err: any) {
                if (offlineId && err.code === 'P2002') {
                    const previous = await findReplay();
                    if (previous) { sale = previous; replayed = true; break; }
                }
                // Conflictos de numeración o serialización: volver a leer el estado.
                const isSaleNumberConflict =
                    err.code === 'P2002' &&
                    Array.isArray(err.meta?.target) &&
                    err.meta.target.includes('saleNumber');

                if ((isSaleNumberConflict || err.code === 'P2034') && attempt < 4) {
                    console.warn(`[sale] Conflicto de saleNumber, reintentando (intento ${attempt + 2}/5)…`);
                    await new Promise(r => setTimeout(r, 40 * (attempt + 1)));
                    continue;
                }
                throw err; // Otro error o se agotaron los reintentos
            }
        }

        if (!sale) throw new Error('No se pudo generar número de venta tras 5 intentos');
        // ── FIN LOOP DE REINTENTOS ──────────────────────────────────────────




        return NextResponse.json({
            success: true,
            data: {
                id: sale.id,
                saleNumber: sale.saleNumber,
                totalAmount: sale.totalAmount,
                paymentMethod: sale.paymentMethod,
            },
            replayed,
        }, { status: replayed ? 200 : 201 });

    } catch (error: any) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        console.error('Error POST /api/pos/sale:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error al crear la venta' },
            { status: 500 }
        );
    }
}


/**
 * GET /api/pos/sale?branchId=xxx&date=YYYY-MM-DD
 * Historial de ventas del día para una sucursal
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId');
        const dateStr = searchParams.get('date');

        if (!branchId) {
            return NextResponse.json(
                { success: false, error: 'branchId es requerido' },
                { status: 400 }
            );
        }

        const access = await requireBranchAccess(request, branchId);
        if (access instanceof NextResponse) return access;

        // Filtrar por fecha (por defecto hoy)
        const date = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await prisma.sale.findMany({
            where: {
                branchId,
                deletedAt: null,
                createdAt: { gte: startOfDay, lte: endOfDay },
            },
            include: {
                items: {
                    include: {
                        product: { select: { name: true, type: true } },
                        modifiers: { include: { modifier: { select: { name: true } } } },
                    },
                },
                user: { select: { name: true } },
                discounts: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: sales });
    } catch (error) {
        console.error('Error GET /api/pos/sale:', error);
        return NextResponse.json(
            { success: false, error: 'Error al obtener ventas' },
            { status: 500 }
        );
    }
}
