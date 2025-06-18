-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "shipstationId" INTEGER NOT NULL,
    "orderData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '',
    "storeId" INTEGER DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipstationWebhookResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceUrl" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "orderData" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shipstationId_key" ON "Order"("shipstationId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_shipstationId_idx" ON "Order"("shipstationId");

-- CreateIndex
CREATE INDEX "ShipstationWebhookResponse_resourceType_idx" ON "ShipstationWebhookResponse"("resourceType");

-- CreateIndex
CREATE INDEX "ShipstationWebhookResponse_processed_idx" ON "ShipstationWebhookResponse"("processed");
