-- LeagueMembership: who gets referral credit for this join, and whether the
-- one-time reward for it has already been paid out.
ALTER TABLE "LeagueMembership" ADD COLUMN "invitedById" TEXT;
ALTER TABLE "LeagueMembership" ADD COLUMN "rewardGranted" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "LeagueMembership_invitedById_idx" ON "LeagueMembership"("invitedById");

ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User: a personal, stable referral code (independent of any league's own
-- inviteCode) so a share link credits the specific person who sent it.
--
-- Added nullable first so the unique index below can go on immediately
-- (a unique index tolerates any number of NULLs — only non-null collisions
-- are rejected), then backfilled row-by-row for the users that already
-- exist, then locked to NOT NULL. Doing it in that order means the backfill
-- loop is race-safe against its own collisions: a repeat draw of the same
-- code trips the index's unique_violation and just retries.
ALTER TABLE "User" ADD COLUMN "referralCode" TEXT;

CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

DO $$
DECLARE
  r RECORD;
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I — mirrors League.inviteCode
  code TEXT;
  placed BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM "User" WHERE "referralCode" IS NULL LOOP
    placed := false;
    WHILE NOT placed LOOP
      code := '';
      FOR i IN 1..6 LOOP
        code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
      END LOOP;
      BEGIN
        UPDATE "User" SET "referralCode" = code WHERE id = r.id;
        placed := true;
      EXCEPTION WHEN unique_violation THEN
        placed := false;
      END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;
