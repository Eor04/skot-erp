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

        // Calcular total
        let totalAmount = items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);

        // Aplicar descuento
        let discountAmount = 0;
        if (discount) {
            if (discount.type === 'PERCENTAGE') {
                discountAmount = totalAmount * (discount.value / 100);
            } else {
                discountAmount = discount.value;
            }
            totalAmount -= discountAmount;
        }

        // Generar número de venta secuencial
        const today = new Date();
        const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        const lastSale = await prisma.sale.findFirst({
            where: { saleNumber: { startsWith: `V-${datePrefix}` } },
            orderBy: { saleNumber: 'desc' },
        });

        const seq = lastSale
            ? parseInt(lastSale.saleNumber.split('-').pop() || '0') + 1
            : 1;
        const saleNumber = `V-${datePrefix}-${String(seq).padStart(4, '0')}`;

        // Crear venta en una transacción atómica
        const sale = await prisma.$transaction(async (tx) => {
            // 1. Crear la venta
            const newSale = await tx.sale.create({
                data: {
                    branchId,
                    userId,
                    saleNumber,
                    totalAmount,
                    paymentMethod: paymentMethod as any,
                    salesChannel: salesChannel as any,
                    cashAmount: cashAmount ?? null,
                    cardAmount: cardAmount ?? null,
                    transferAmount: transferAmount ?? null,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.subtotal,
                            discount: 0,
                            modifiers: item.modifiers?.length
                                ? {
                                    create: item.modifiers.map((mod: any) => ({
                                        modifierId: mod.modifierId,
                                        quantity: mod.quantity || 1,
                                        price: mod.price,
                                    })),
                                }
                                : undefined,
                        })),
                    },
                },
                include: {
                    items: { include: { modifiers: true } },
                },
            });

            // 2. Registrar descuento si aplica
            if (discount && discountAmount > 0) {
                await tx.discount.create({
                    data: {
                        saleId: newSale.id,
                        type: discount.type,
                        value: discount.value,
                        authorizedBy: discount.authorizedBy ?? null,
                    },
                });
            }

            // 3. Descontar stock de cada producto
            for (const item of items) {
                await tx.inventory.updateMany({
                    where: {
                        branchId,
                        productId: item.productId,
                    },
                    data: {
                        currentStock: { decrement: item.quantity },
                        lastUpdated: new Date(),
                    },
                });

                // Registrar movimiento de stock (kardex)
                const inv = await tx.inventory.findFirst({
                    where: { branchId, productId: item.productId },
                });

                if (inv) {
                    await tx.stockMovement.create({
                        data: {
                            branchId,
                            productId: item.productId,
                            type: 'SALIDA',
                            quantity: -item.quantity,
                            previousStock: inv.currentStock + item.quantity,
                            newStock: inv.currentStock,
                            reference: saleNumber,
                            saleId: newSale.id,
                            inventoryId: inv.id,
                            createdBy: userId,
                            notes: `Venta ${saleNumber}`,
                        },
                    });
                }
            }

            return newSale;
        });

        return NextResponse.json({
            success: true,
            data: {
                id: sale.id,
                saleNumber: sale.saleNumber,
                totalAmount: sale.totalAmount,
                paymentMethod: sale.paymentMethod,
                items: sale.items,
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
