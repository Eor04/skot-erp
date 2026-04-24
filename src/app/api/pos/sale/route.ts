import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

        // Calcular total (incluye extras sueltos)
        let totalAmount = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
                        + (parseFloat(extrasTotal) || 0);
        let discountAmount = 0;
        if (discount) {
            discountAmount = discount.type === 'PERCENTAGE'
                ? totalAmount * (discount.value / 100)
                : discount.value;
            totalAmount -= discountAmount;
        }

        // Ítems que descuentan stock — pre-calculados una sola vez
        const stockItems = items.filter((item: any) => item.unitPrice > 0 || item.subtotal > 0);
        const uniqueProductIds = [...new Set(stockItems.map((item: any) => item.productId as string))];

        // Pre-cargar inventario una sola vez fuera del loop de reintentos
        const inventoryRecords = uniqueProductIds.length > 0
            ? await prisma.inventory.findMany({
                where: { branchId, productId: { in: uniqueProductIds } },
                select: { id: true, productId: true, currentStock: true },
            })
            : [];
        const invMap = new Map(inventoryRecords.map(inv => [inv.productId, inv]));

        const today = new Date();
        const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ── CREAR VENTA CON REINTENTOS (saleNumber único) ──────────────────
        // Hasta 5 intentos: si hay conflicto de saleNumber (P2002) por concurrencia,
        // re-consulta el último número y vuelve a intentar.
        let sale: any = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            try {
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

                sale = await prisma.$transaction(async (tx) => {
                    // 1. Crear la venta con ítems y modificadores
                    const newSale = await tx.sale.create({
                        data: {
                            branchId, userId, saleNumber, totalAmount,
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
                                authorizedBy: discount.authorizedBy ?? null,
                            },
                        });
                    }

                    // 3. Descontar stock en paralelo
                    if (uniqueProductIds.length > 0) {
                        await Promise.all(
                            uniqueProductIds.map(productId => {
                                const qty = stockItems
                                    .filter((i: any) => i.productId === productId)
                                    .reduce((s: number, i: any) => s + i.quantity, 0);
                                return tx.inventory.updateMany({
                                    where: { branchId, productId },
                                    data: { currentStock: { decrement: qty }, lastUpdated: new Date() },
                                });
                            })
                        );
                    }

                    return newSale;
                }, { timeout: 15000, maxWait: 5000 });

                break; // ← Éxito, salir del loop

            } catch (err: any) {
                // P2002 en saleNumber → conflicto de concurrencia, reintentar
                const isSaleNumberConflict =
                    err.code === 'P2002' &&
                    Array.isArray(err.meta?.target) &&
                    err.meta.target.includes('saleNumber');

                if (isSaleNumberConflict && attempt < 4) {
                    console.warn(`[sale] Conflicto de saleNumber, reintentando (intento ${attempt + 2}/5)…`);
                    await new Promise(r => setTimeout(r, 40 * (attempt + 1)));
                    continue;
                }
                throw err; // Otro error o se agotaron los reintentos
            }
        }

        if (!sale) throw new Error('No se pudo generar número de venta tras 5 intentos');
        // ── FIN LOOP DE REINTENTOS ──────────────────────────────────────────


        // Kardex: se registra DESPUÉS de confirmar la venta exitosamente
        // No bloquea la respuesta (pero sí se ejecuta antes de responder al cliente)
        if (stockItems.length > 0) {
            const movements = stockItems.flatMap((item: any) => {
                const inv = invMap.get(item.productId);
                if (!inv) return [];
                return [{
                    branchId,
                    productId: item.productId,
                    type: 'SALIDA' as const,
                    quantity: -item.quantity,
                    previousStock: inv.currentStock,
                    newStock: inv.currentStock - item.quantity,
                    reference: sale.saleNumber,
                    saleId: sale.id,
                    inventoryId: inv.id,
                    createdBy: userId,
                    notes: `Venta ${sale.saleNumber}`,
                }];
            });
            if (movements.length > 0) {
                // Fire-and-forget: no esperamos para responder al cliente más rápido
                prisma.stockMovement.createMany({ data: movements, skipDuplicates: true })
                    .catch(err => console.error('[kardex] Error registrando movimientos:', err));
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: sale.id,
                saleNumber: sale.saleNumber,
                totalAmount: sale.totalAmount,
                paymentMethod: sale.paymentMethod,
            },
        }, { status: 201 });

    } catch (error: any) {
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
