-- Numune Dokuma refactor (Section 14 revision):
--   * kg / ham_en / mamul_en / durum / completion_date → numune_atilim'e taşı
--   * atki 6-8 (numune_atilim) ve renk 6-8 (numune_varyant) ekle (max 8'e kadar dinamik)

-- 1) numune_atilim: yeni kolonlar
ALTER TABLE "numune_atilim"
  ADD COLUMN "atki_6" text,
  ADD COLUMN "atki_7" text,
  ADD COLUMN "atki_8" text,
  ADD COLUMN "kg" numeric(6,2),
  ADD COLUMN "ham_en" integer,
  ADD COLUMN "mamul_en" integer,
  ADD COLUMN "durum" varchar(30) DEFAULT 'acik' NOT NULL,
  ADD COLUMN "completion_date" date;

-- 2) Mevcut variant durum'larından numune.durum'u türet (en yüksek-precedence durumu kullan)
-- Tüm variant durum'ları 'acik' olduğu için numune'ler de 'acik' kalacak (default).
-- Yine de güvenli olsun diye "MAX" derecesini set et:
WITH ranks AS (
  SELECT
    numune_atilim_id,
    MAX(
      CASE durum
        WHEN 'iptal' THEN 4
        WHEN 'tamamlandi' THEN 3
        WHEN 'kalite_kontrolde' THEN 2
        WHEN 'dokumada' THEN 1
        ELSE 0
      END
    ) AS max_rank,
    MAX(completion_date) AS max_completion
  FROM numune_varyant
  GROUP BY numune_atilim_id
)
UPDATE numune_atilim n
SET
  durum = CASE r.max_rank
    WHEN 4 THEN 'iptal'
    WHEN 3 THEN 'tamamlandi'
    WHEN 2 THEN 'kalite_kontrolde'
    WHEN 1 THEN 'dokumada'
    ELSE 'acik'
  END,
  completion_date = r.max_completion
FROM ranks r
WHERE n.id = r.numune_atilim_id;

-- 3) numune_atilim'e durum index'i
CREATE INDEX IF NOT EXISTS "numune_durum_idx" ON "numune_atilim" ("durum");

-- 4) numune_varyant: yeni renk kolonları
ALTER TABLE "numune_varyant"
  ADD COLUMN "renk_6" varchar(100),
  ADD COLUMN "renk_7" varchar(100),
  ADD COLUMN "renk_8" varchar(100);

-- 5) numune_varyant: gereksiz kolonları kaldır
DROP INDEX IF EXISTS "numune_varyant_durum_idx";
ALTER TABLE "numune_varyant"
  DROP COLUMN "kg",
  DROP COLUMN "ham_en",
  DROP COLUMN "mamul_en",
  DROP COLUMN "durum",
  DROP COLUMN "completion_date";
