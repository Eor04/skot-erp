-- Las ventas existentes conservan NULL; no se alteran registros históricos.
ALTER TABLE "sales" ADD COLUMN "offlineId" TEXT, ADD COLUMN "offlinePayloadHash" TEXT;
CREATE UNIQUE INDEX "sales_branchId_offlineId_key" ON "sales"("branchId", "offlineId");
