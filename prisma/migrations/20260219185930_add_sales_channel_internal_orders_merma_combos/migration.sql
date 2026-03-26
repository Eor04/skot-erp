-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('DIRECT', 'PEDIDOS_YA', 'UBER_EATS', 'PICKUP');

-- CreateEnum
CREATE TYPE "InternalOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MermaReason" AS ENUM ('VENCIMIENTO', 'DANO_FISICO', 'DIFERENCIA_RECEPCION', 'PROCESO_PRODUCCION', 'OTRO');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "externalOrderId" TEXT,
ADD COLUMN     "salesChannel" "SalesChannel" NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "internal_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" "InternalOrderStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "dispatchedBy" TEXT,
    "receivedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL,
    "approvedQty" DOUBLE PRECISION,
    "dispatchedQty" DOUBLE PRECISION,
    "receivedQty" DOUBLE PRECISION,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "notes" TEXT,

    CONSTRAINT "internal_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merma_records" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "reason" "MermaReason" NOT NULL,
    "description" TEXT,
    "internalOrderId" TEXT,
    "registeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merma_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_items" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "combo_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_orders_orderNumber_key" ON "internal_orders"("orderNumber");

-- CreateIndex
CREATE INDEX "internal_orders_fromBranchId_idx" ON "internal_orders"("fromBranchId");

-- CreateIndex
CREATE INDEX "internal_orders_toBranchId_idx" ON "internal_orders"("toBranchId");

-- CreateIndex
CREATE INDEX "internal_orders_status_idx" ON "internal_orders"("status");

-- CreateIndex
CREATE INDEX "internal_order_items_orderId_idx" ON "internal_order_items"("orderId");

-- CreateIndex
CREATE INDEX "internal_order_items_productId_idx" ON "internal_order_items"("productId");

-- CreateIndex
CREATE INDEX "merma_records_branchId_idx" ON "merma_records"("branchId");

-- CreateIndex
CREATE INDEX "merma_records_productId_idx" ON "merma_records"("productId");

-- CreateIndex
CREATE INDEX "merma_records_createdAt_idx" ON "merma_records"("createdAt");

-- CreateIndex
CREATE INDEX "combos_active_idx" ON "combos"("active");

-- CreateIndex
CREATE INDEX "combo_items_comboId_idx" ON "combo_items"("comboId");

-- CreateIndex
CREATE INDEX "sales_salesChannel_idx" ON "sales"("salesChannel");

-- AddForeignKey
ALTER TABLE "internal_orders" ADD CONSTRAINT "internal_orders_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_orders" ADD CONSTRAINT "internal_orders_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_order_items" ADD CONSTRAINT "internal_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "internal_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_order_items" ADD CONSTRAINT "internal_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merma_records" ADD CONSTRAINT "merma_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merma_records" ADD CONSTRAINT "merma_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merma_records" ADD CONSTRAINT "merma_records_internalOrderId_fkey" FOREIGN KEY ("internalOrderId") REFERENCES "internal_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "combos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_items" ADD CONSTRAINT "combo_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
