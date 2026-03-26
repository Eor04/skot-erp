-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "requireCashClose" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cardAmount" DOUBLE PRECISION,
ADD COLUMN     "cashAmount" DOUBLE PRECISION,
ADD COLUMN     "transferAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "product_modifiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item_modifiers" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "modifierId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "sale_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "authorizedBy" TEXT,
    "authorizationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_closes" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openingAmount" DOUBLE PRECISION NOT NULL,
    "expectedCash" DOUBLE PRECISION NOT NULL,
    "actualCash" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL,
    "cashSales" DOUBLE PRECISION NOT NULL,
    "cardSales" DOUBLE PRECISION NOT NULL,
    "transferSales" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_register_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloudinary_config" (
    "id" TEXT NOT NULL,
    "cloudName" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'skot/products',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloudinary_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_modifiers_category_idx" ON "product_modifiers"("category");

-- CreateIndex
CREATE INDEX "product_modifiers_active_idx" ON "product_modifiers"("active");

-- CreateIndex
CREATE INDEX "sale_item_modifiers_saleItemId_idx" ON "sale_item_modifiers"("saleItemId");

-- CreateIndex
CREATE INDEX "sale_item_modifiers_modifierId_idx" ON "sale_item_modifiers"("modifierId");

-- CreateIndex
CREATE INDEX "discounts_saleId_idx" ON "discounts"("saleId");

-- CreateIndex
CREATE INDEX "discounts_authorizedBy_idx" ON "discounts"("authorizedBy");

-- CreateIndex
CREATE INDEX "cash_register_closes_branchId_idx" ON "cash_register_closes"("branchId");

-- CreateIndex
CREATE INDEX "cash_register_closes_userId_idx" ON "cash_register_closes"("userId");

-- CreateIndex
CREATE INDEX "cash_register_closes_createdAt_idx" ON "cash_register_closes"("createdAt");

-- AddForeignKey
ALTER TABLE "sale_item_modifiers" ADD CONSTRAINT "sale_item_modifiers_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item_modifiers" ADD CONSTRAINT "sale_item_modifiers_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "product_modifiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_closes" ADD CONSTRAINT "cash_register_closes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_closes" ADD CONSTRAINT "cash_register_closes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
