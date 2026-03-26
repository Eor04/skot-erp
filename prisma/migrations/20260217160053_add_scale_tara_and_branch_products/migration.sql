-- AlterTable
ALTER TABLE "scale_configs" ADD COLUMN     "tara" DOUBLE PRECISION NOT NULL DEFAULT 0.15;

-- CreateTable
CREATE TABLE "branch_products" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customPrice" DOUBLE PRECISION,
    "pricePerKg" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "branch_products_branchId_idx" ON "branch_products"("branchId");

-- CreateIndex
CREATE INDEX "branch_products_productId_idx" ON "branch_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "branch_products_branchId_productId_key" ON "branch_products"("branchId", "productId");

-- AddForeignKey
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch_products" ADD CONSTRAINT "branch_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
