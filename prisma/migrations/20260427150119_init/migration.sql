-- CreateTable
CREATE TABLE "members" (
    "member_id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "contact_no" TEXT,
    "address" TEXT,
    "birthdate" TEXT,
    "emergency_contact" TEXT,
    "card_uid" TEXT,
    "custom_card_id" TEXT,
    "image_path" TEXT,
    "notes" TEXT,
    "created_at" TEXT,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "membership_id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "plan_type" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "months_purchased" INTEGER,
    "status" TEXT,
    "created_at" TEXT,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("membership_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" SERIAL NOT NULL,
    "member_id" INTEGER NOT NULL,
    "membership_id" INTEGER,
    "amount" DOUBLE PRECISION,
    "mop" TEXT,
    "payment_date" TEXT,
    "notes" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "logs" (
    "log_id" SERIAL NOT NULL,
    "member_id" INTEGER,
    "card_uid" TEXT,
    "action" TEXT,
    "timestamp" TEXT,
    "duration_seconds" INTEGER,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "admin_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TEXT,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "walkins" (
    "walkin_id" SERIAL NOT NULL,
    "guest_name" TEXT,
    "amount_paid" DOUBLE PRECISION,
    "payment_date" TEXT,
    "notes" TEXT,

    CONSTRAINT "walkins_pkey" PRIMARY KEY ("walkin_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_card_uid_key" ON "members"("card_uid");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("membership_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;
