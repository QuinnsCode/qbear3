-- CreateTable
CREATE TABLE "shipstation_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" INTEGER NOT NULL,
    "order_number" TEXT,
    "order_status" TEXT,
    "raw_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shipstation_webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resource_url" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "raw_data" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notes_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "shipstation_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "shipstation_orders_order_id_key" ON "shipstation_orders"("order_id");

-- CreateIndex
CREATE INDEX "shipstation_orders_order_id_idx" ON "shipstation_orders"("order_id");

-- CreateIndex
CREATE INDEX "shipstation_orders_order_number_idx" ON "shipstation_orders"("order_number");

-- CreateIndex
CREATE INDEX "shipstation_orders_order_status_idx" ON "shipstation_orders"("order_status");

-- CreateIndex
CREATE INDEX "shipstation_webhooks_resource_type_idx" ON "shipstation_webhooks"("resource_type");

-- CreateIndex
CREATE INDEX "shipstation_webhooks_processed_idx" ON "shipstation_webhooks"("processed");

-- CreateIndex
CREATE INDEX "notes_entity_type_entity_id_idx" ON "notes"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");

-- CreateIndex
CREATE INDEX "notes_created_at_idx" ON "notes"("created_at");
