-- Section 15: Numune-level "Top No" alanı (KK barkod / parti no)
-- Boyahane modülü gelince numune_atilim.top_no üzerinden bağlanacak.

ALTER TABLE "numune_atilim" ADD COLUMN "top_no" varchar(60);

CREATE INDEX IF NOT EXISTS "numune_top_no_idx"
  ON "numune_atilim" ("top_no")
  WHERE "top_no" IS NOT NULL;
