-- Section 16: Atkı → İro eşlemesi
-- Her atki ipliği fiziksel bir iroya (atkı motoru) takılır. İro arızalı olursa
-- operatör atki'yı başka iroya alır. PDF iş emrinde "İro Sıralaması" gösterilecek.

ALTER TABLE "numune_atilim"
  ADD COLUMN "iro_1" smallint,
  ADD COLUMN "iro_2" smallint,
  ADD COLUMN "iro_3" smallint,
  ADD COLUMN "iro_4" smallint,
  ADD COLUMN "iro_5" smallint,
  ADD COLUMN "iro_6" smallint,
  ADD COLUMN "iro_7" smallint,
  ADD COLUMN "iro_8" smallint;

-- Backfill: mevcut numune'lerde atki_N dolu ise iro_N = N (sensible default)
UPDATE "numune_atilim" SET "iro_1" = 1 WHERE "atki_1" IS NOT NULL AND TRIM("atki_1") <> '';
UPDATE "numune_atilim" SET "iro_2" = 2 WHERE "atki_2" IS NOT NULL AND TRIM("atki_2") <> '';
UPDATE "numune_atilim" SET "iro_3" = 3 WHERE "atki_3" IS NOT NULL AND TRIM("atki_3") <> '';
UPDATE "numune_atilim" SET "iro_4" = 4 WHERE "atki_4" IS NOT NULL AND TRIM("atki_4") <> '';
UPDATE "numune_atilim" SET "iro_5" = 5 WHERE "atki_5" IS NOT NULL AND TRIM("atki_5") <> '';
UPDATE "numune_atilim" SET "iro_6" = 6 WHERE "atki_6" IS NOT NULL AND TRIM("atki_6") <> '';
UPDATE "numune_atilim" SET "iro_7" = 7 WHERE "atki_7" IS NOT NULL AND TRIM("atki_7") <> '';
UPDATE "numune_atilim" SET "iro_8" = 8 WHERE "atki_8" IS NOT NULL AND TRIM("atki_8") <> '';
