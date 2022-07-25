-- CreateTable
CREATE TABLE "beta_access_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usage_plans" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beta_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_access_requests_email_key" ON "beta_access_requests"("email");
