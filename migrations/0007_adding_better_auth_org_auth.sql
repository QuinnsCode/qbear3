-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_apikey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "name" TEXT,
    "service" TEXT,
    "keyType" TEXT,
    "start" TEXT,
    "prefix" TEXT,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "refillInterval" INTEGER,
    "refillAmount" INTEGER,
    "lastRefillAt" DATETIME,
    "enabled" BOOLEAN DEFAULT true,
    "rateLimitEnabled" BOOLEAN,
    "rateLimitTimeWindow" INTEGER,
    "rateLimitMax" INTEGER,
    "requestCount" INTEGER,
    "remaining" INTEGER,
    "lastRequest" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "permissions" TEXT,
    "metadata" TEXT,
    CONSTRAINT "apikey_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "apikey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_apikey" ("createdAt", "enabled", "expiresAt", "id", "key", "lastRefillAt", "lastRequest", "metadata", "name", "permissions", "prefix", "rateLimitEnabled", "rateLimitMax", "rateLimitTimeWindow", "refillAmount", "refillInterval", "remaining", "requestCount", "start", "updatedAt", "userId") SELECT "createdAt", "enabled", "expiresAt", "id", "key", "lastRefillAt", "lastRequest", "metadata", "name", "permissions", "prefix", "rateLimitEnabled", "rateLimitMax", "rateLimitTimeWindow", "refillAmount", "refillInterval", "remaining", "requestCount", "start", "updatedAt", "userId" FROM "apikey";
DROP TABLE "apikey";
ALTER TABLE "new_apikey" RENAME TO "apikey";
CREATE INDEX "apikey_organization_id_idx" ON "apikey"("organization_id");
CREATE INDEX "apikey_service_keyType_idx" ON "apikey"("service", "keyType");
CREATE TABLE "new_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "notes_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "shipstation_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_notes" ("content", "created_at", "entity_id", "entity_type", "id", "is_internal", "metadata", "updated_at", "user_id") SELECT "content", "created_at", "entity_id", "entity_type", "id", "is_internal", "metadata", "updated_at", "user_id" FROM "notes";
DROP TABLE "notes";
ALTER TABLE "new_notes" RENAME TO "notes";
CREATE INDEX "notes_organization_id_idx" ON "notes"("organization_id");
CREATE INDEX "notes_entity_type_entity_id_idx" ON "notes"("entity_type", "entity_id");
CREATE INDEX "notes_user_id_idx" ON "notes"("user_id");
CREATE INDEX "notes_created_at_idx" ON "notes"("created_at");
CREATE TABLE "new_shipstation_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "order_id" INTEGER NOT NULL,
    "order_number" TEXT,
    "order_status" TEXT,
    "raw_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shipstation_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_shipstation_orders" ("created_at", "id", "order_id", "order_number", "order_status", "raw_data", "updated_at") SELECT "created_at", "id", "order_id", "order_number", "order_status", "raw_data", "updated_at" FROM "shipstation_orders";
DROP TABLE "shipstation_orders";
ALTER TABLE "new_shipstation_orders" RENAME TO "shipstation_orders";
CREATE INDEX "shipstation_orders_organization_id_idx" ON "shipstation_orders"("organization_id");
CREATE INDEX "shipstation_orders_order_id_idx" ON "shipstation_orders"("order_id");
CREATE INDEX "shipstation_orders_order_number_idx" ON "shipstation_orders"("order_number");
CREATE INDEX "shipstation_orders_order_status_idx" ON "shipstation_orders"("order_status");
CREATE TABLE "new_shipstation_webhooks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "resource_url" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "raw_data" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shipstation_webhooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_shipstation_webhooks" ("created_at", "id", "processed", "raw_data", "resource_type", "resource_url") SELECT "created_at", "id", "processed", "raw_data", "resource_type", "resource_url" FROM "shipstation_webhooks";
DROP TABLE "shipstation_webhooks";
ALTER TABLE "new_shipstation_webhooks" RENAME TO "shipstation_webhooks";
CREATE INDEX "shipstation_webhooks_organization_id_idx" ON "shipstation_webhooks"("organization_id");
CREATE INDEX "shipstation_webhooks_resource_type_idx" ON "shipstation_webhooks"("resource_type");
CREATE INDEX "shipstation_webhooks_processed_idx" ON "shipstation_webhooks"("processed");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
