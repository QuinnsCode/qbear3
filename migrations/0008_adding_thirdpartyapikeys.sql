-- CreateTable
CREATE TABLE "third_party_api_keys" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "encrypted_auth" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_used" DATETIME,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "third_party_api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "third_party_api_keys_organization_id_idx" ON "third_party_api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "third_party_api_keys_service_idx" ON "third_party_api_keys"("service");
