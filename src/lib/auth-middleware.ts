/**
 * Middleware de Autorización Multi-Tenant
 * Asegura que los usuarios solo accedan a datos de sus sucursales asignadas
 */

import { UserRole } from '@prisma/client';
import { prisma } from './db';

// Contexto de usuario para autorización
export interface UserContext {
    userId: string;
    role: UserRole;
    allowedBranchIds: string[];
}

/**
 * Obtener IDs de sucursales permitidas para el usuario
 * Usuarios ADMIN pueden acceder a todas las sucursales
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId, active: true, deletedAt: null },
        include: {
            branches: {
                include: {
                    branch: {
                        where: { active: true, deletedAt: null },
                    },
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    // Usuarios ADMIN tienen acceso a todas las sucursales
    if (user.role === UserRole.ADMIN) {
        const allBranches = await prisma.branch.findMany({
            where: { active: true, deletedAt: null },
            select: { id: true },
        });

        return {
            userId: user.id,
            role: user.role,
            allowedBranchIds: allBranches.map((b) => b.id),
        };
    }

    // Otros usuarios solo acceden a sus sucursales asignadas
    return {
        userId: user.id,
        role: user.role,
        allowedBranchIds: user.branches.map((ub) => ub.branch.id),
    };
}

/**
 * Verificar si el usuario tiene acceso a una sucursal específica
 */
export async function canAccessBranch(
    userId: string,
    branchId: string
): Promise<boolean> {
    const context = await getUserContext(userId);
    if (!context) return false;

    return context.allowedBranchIds.includes(branchId);
}

/**
 * Filtro de consulta para incluir solo sucursales accesibles por el usuario
 * Uso: { branchId: { in: await getBranchFilter(userId) } }
 */
export async function getBranchFilter(userId: string): Promise<string[]> {
    const context = await getUserContext(userId);
    if (!context) return [];

    return context.allowedBranchIds;
}

/**
 * Verificaciones de permisos basados en roles
 */
export const Permissions = {
    // Permisos de inventario
    canManageInventory: (role: UserRole) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE].includes(role),

    canViewInventory: (role: UserRole) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.CASHIER].includes(role),

    // Permisos de ventas
    canCreateSale: (role: UserRole) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER].includes(role),

    canDeleteSale: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),

    // Permisos de gestión de usuarios
    canManageUsers: (role: UserRole) => [UserRole.ADMIN].includes(role),

    // Permisos de gestión de sucursales
    canManageBranches: (role: UserRole) => [UserRole.ADMIN].includes(role),

    // Permisos de gestión de productos
    canManageProducts: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),

    // Permisos de configuración de balanza
    canManageScales: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),

    // Permisos de panel admin (acceso a dashboard, analytics, etc.)
    canAccessAdminPanel: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),

    // Permisos de autorización de descuentos (>15%)
    canAuthorizeDiscounts: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),

    // Permisos de cierre de caja
    canCloseCashRegister: (role: UserRole) =>
        [UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER].includes(role),

    // Permisos de visualización de analytics
    canViewAnalytics: (role: UserRole) => [UserRole.ADMIN, UserRole.MANAGER].includes(role),
};

/**
 * Validar que el usuario tenga el permiso requerido
 */
export async function requirePermission(
    userId: string,
    permissionCheck: (role: UserRole) => boolean
): Promise<boolean> {
    const context = await getUserContext(userId);
    if (!context) return false;

    return permissionCheck(context.role);
}

/**
 * Ejemplo de uso en rutas API:
 * 
 * // Obtener contexto de usuario
 * const context = await getUserContext(session.user.id);
 * if (!context) throw new Error('No autorizado');
 * 
 * // Consultar solo sucursales accesibles
 * const sales = await prisma.sale.findMany({
 *   where: {
 *     branchId: { in: context.allowedBranchIds }
 *   }
 * });
 * 
 * // Verificar permiso específico
 * if (!Permissions.canManageInventory(context.role)) {
 *   throw new Error('Permisos insuficientes');
 * }
 */
