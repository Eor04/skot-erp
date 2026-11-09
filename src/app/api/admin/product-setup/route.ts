import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBranchAccess } from '@/lib/branch-access';
import { consumptionConfig, consumptionInclude } from '@/lib/consumption-config';
import { OperationError, serializableTransaction } from '@/lib/transaction';
import { Prisma } from '@prisma/client';
import { ensureUnitCanChange } from '@/lib/product-unit';

export async function GET(request: NextRequest) {
    const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
    if (access instanceof NextResponse) return access;
    try {
        const [products, recipes, branches] = await Promise.all([
            prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' },
                select: { id: true, name: true, sku: true, unit: true, category: true, type: true, description: true, imageUrl: true, consumptionMode: true, saleRecipeId: true, active: true, setupDraft: true,
                    branchProducts: { where: { branchId: { in: access.allowedBranchIds } }, select: { branchId: true, active: true, customPrice: true, pricePerKg: true } } } }),
            prisma.recipe.findMany({ where: { active: true }, select: { id: true, name: true, productId: true, yield: true, yieldUnit: true } }),
            prisma.branch.findMany({ where: { id: { in: access.allowedBranchIds }, active: true, deletedAt: null, type: { not: 'FABRICA' } }, select: { id: true, name: true } }),
        ]);
        return NextResponse.json({ success: true, data: { products, recipes, branches } });
    } catch (error) {
        console.error('Error al cargar preparación:', error);
        return NextResponse.json({ success: false, error: 'No se pudo cargar la configuración' }, { status: 500 });
    }
}

/** Guarda el catálogo y, al publicar, la preparación y todas las sucursales en una transacción. */
export async function POST(request: NextRequest) {
    const access = await requireBranchAccess(request, null, ['ADMIN', 'MANAGER']);
    if (access instanceof NextResponse) return access;
    try {
        const body = await request.json();
        const { id, name, sku, unit, category, description, imageUrl, mode, recipeId, recipe, branches, publish, draftState } = body;
        const types = ['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE', 'ACAI_TOPPING', 'RAW_MATERIAL', 'PACKAGING'];
        if (typeof name !== 'string' || !name.trim() || typeof sku !== 'string' || !sku.trim() ||
            typeof unit !== 'string' || !unit.trim() || !types.includes(category) || typeof publish !== 'boolean') {
            throw new OperationError('Completa nombre, SKU, unidad y categoría');
        }
        if (publish && (!['STOCK', 'RECIPE'].includes(mode) || !Array.isArray(branches) || !branches.length)) {
            throw new OperationError('Selecciona preparación y al menos una sucursal');
        }
        if (!publish && (!draftState || typeof draftState !== 'object' || Array.isArray(draftState) || JSON.stringify(draftState).length > 50000)) {
            throw new OperationError('El borrador no es válido');
        }
        if (publish && !['BURGER', 'BURGER_EXTRA', 'BEVERAGE', 'ACAI_BASE'].includes(category)) {
            throw new OperationError('Esta categoría se administra como insumo; selecciona un producto de venta para publicarlo en POS');
        }
        if (publish && (new Set(branches.map((b: any) => b.branchId)).size !== branches.length ||
            branches.some((b: any) => !access.allowedBranchIds.includes(b.branchId) ||
                typeof b.price !== 'number' || !Number.isFinite(b.price) || b.price <= 0))) {
            throw new OperationError('Revisa las sucursales y sus precios', 400);
        }
        const result = await serializableTransaction(async tx => {
            if (id && typeof id !== 'string') throw new OperationError('Producto inválido');
            const current = id ? await tx.product.findUnique({ where: { id } }) : null;
            if (id && (!current || current.deletedAt)) throw new OperationError('Producto no encontrado', 404);
            if (!publish && current?.active) throw new OperationError('Completa la publicación para guardar cambios de un producto activo');
            if (current) await ensureUnitCanChange(tx, current.id, current.unit, unit);
            if (publish) {
                const count = await tx.branch.count({ where: { id: { in: branches.map((b: any) => b.branchId) },
                    active: true, deletedAt: null, type: { not: 'FABRICA' } } });
                if (count !== branches.length) throw new OperationError('Una sucursal no está disponible para venta');
            }
            const data = { name: name.trim(), sku: sku.trim(), unit: unit.trim(), category,
                description: typeof description === 'string' ? description : null,
                imageUrl: typeof imageUrl === 'string' && imageUrl ? imageUrl : null,
                type: category === 'PACKAGING' ? 'RAW_MATERIAL' as const : category as Exclude<typeof category, 'PACKAGING'> };
            const draft = publish ? Prisma.DbNull : draftState as Prisma.InputJsonValue;
            const product = current ? await tx.product.update({ where: { id }, data: { ...data, setupDraft: draft, ...(publish ? { active: true } : {}) } })
                : await tx.product.create({ data: { ...data, setupDraft: draft, active: publish } });
            if (!publish) return product;
            let selectedRecipeId = mode === 'RECIPE' ? recipeId : null;
            if (mode === 'RECIPE' && recipe && !recipeId) {
                if (!Number.isFinite(recipe.yield) || recipe.yield <= 0 || !Array.isArray(recipe.ingredients) || !recipe.ingredients.length ||
                    recipe.ingredients.some((i: any) => typeof i.id !== 'string' || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
                    throw new OperationError('Completa el rendimiento y los ingredientes de la receta');
                }
                const ids: string[] = recipe.ingredients.map((i: any) => i.id);
                if (new Set(ids).size !== ids.length) throw new OperationError('No repitas ingredientes en la receta');
                const ingredients = await tx.product.findMany({ where: { id: { in: ids }, active: true, deletedAt: null } });
                if (ingredients.length !== ids.length || ids.includes(product.id)) throw new OperationError('Ingredientes no disponibles');
                const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
                const created = await tx.recipe.create({ data: { productId: product.id, name: product.name,
                    yield: recipe.yield, yieldUnit: product.unit,
                    ingredients: { create: recipe.ingredients.map((i: any) => ({ ingredientId: i.id,
                        quantity: i.quantity, unit: ingredientMap.get(i.id)!.unit })) } } });
                selectedRecipeId = created.id;
            }
            if (mode === 'RECIPE' && typeof selectedRecipeId !== 'string') throw new OperationError('Selecciona o crea una receta');
            const configured = await tx.product.update({ where: { id: product.id },
                data: { consumptionMode: mode, saleRecipeId: selectedRecipeId }, include: consumptionInclude });
            try { consumptionConfig(configured); }
            catch (error) { throw new OperationError(error instanceof Error ? error.message : 'Preparación inválida'); }
            await tx.branchProduct.updateMany({ where: { productId: product.id,
                branchId: { in: access.allowedBranchIds, notIn: branches.map((b: any) => b.branchId) },
                branch: { type: { not: 'FABRICA' } } }, data: { active: false } });
            for (const branch of branches) {
                const price = product.type === 'ACAI_BASE' ? { pricePerKg: branch.price, customPrice: null } : { customPrice: branch.price, pricePerKg: null };
                await tx.branchProduct.upsert({ where: { branchId_productId: { branchId: branch.branchId, productId: product.id } },
                    create: { branchId: branch.branchId, productId: product.id, ...price, active: true },
                    update: { ...price, active: true } });
            }
            return configured;
        });
        return NextResponse.json({ success: true, data: result }, { status: id ? 200 : 201 });
    } catch (error: any) {
        if (error instanceof OperationError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
        if (error?.code === 'P2002') return NextResponse.json({ success: false, error: 'El SKU ya existe' }, { status: 409 });
        if (error?.code === 'P2003') return NextResponse.json({ success: false, error: 'La receta indicada no existe' }, { status: 400 });
        console.error('Error al preparar producto:', error);
        return NextResponse.json({ success: false, error: 'No se pudo guardar el producto' }, { status: 500 });
    }
}
