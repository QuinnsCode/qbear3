-- CreateTable
CREATE TABLE "squeeze_subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lemon_squeezy_subscription_id" TEXT,
    "lemon_squeezy_customer_id" TEXT,
    "lemon_squeezy_variant_id" TEXT,
    "current_period_start" DATETIME,
    "current_period_end" DATETIME,
    "trial_ends_at" DATETIME,
    "ends_at" DATETIME,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "squeeze_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "squeeze_subscriptions_user_id_key" ON "squeeze_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "squeeze_subscriptions_lemon_squeezy_subscription_id_key" ON "squeeze_subscriptions"("lemon_squeezy_subscription_id");

-- CreateIndex
CREATE INDEX "squeeze_subscriptions_tier_idx" ON "squeeze_subscriptions"("tier");

-- CreateIndex
CREATE INDEX "squeeze_subscriptions_status_idx" ON "squeeze_subscriptions"("status");

-- CreateIndex
CREATE INDEX "squeeze_subscriptions_lemon_squeezy_subscription_id_idx" ON "squeeze_subscriptions"("lemon_squeezy_subscription_id");