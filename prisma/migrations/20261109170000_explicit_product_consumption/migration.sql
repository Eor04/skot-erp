-- Los productos existentes quedan sin clasificar para su revisión funcional.
CREATE TYPE "InventoryConsumptionMode" AS ENUM ('STOCK', 'RECIPE');
ALTER TABLE "products" ADD COLUMN "consumptionMode" "InventoryConsumptionMode";
ALTER TABLE "products" ADD COLUMN "saleRecipeId" TEXT;
ALTER TABLE "products" ADD CONSTRAINT "products_saleRecipeId_fkey"
  FOREIGN KEY ("saleRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
