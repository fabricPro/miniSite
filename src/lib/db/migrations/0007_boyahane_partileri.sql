-- Section 17: Boyahane modülü
-- Top No artık numune'nin değil, boyahane partisinin alanı (1 numune → N top)
-- ERP'den gelecek alanlar manuel başlıyor (parti_no_fk, durum, gittigi_boyane, gelen_mt, gitme/gelme tarihi)

CREATE TABLE "boyahane_partileri" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "uniq_sira" integer,
  "satir_durumu" varchar(20),
  "top_no" varchar(60) NOT NULL,
  "d_try" varchar(60),
  "numune_atilim_id" uuid REFERENCES "numune_atilim"("id") ON DELETE SET NULL,
  "talep_tarihi" date,
  "termin" date,
  "en" integer,
  "istenen_en" integer,
  "metre" numeric(8,2),
  "kilo" numeric(8,2),
  "desen_no" varchar(120),
  "yapilacak_islem" text,
  "fason_firma" varchar(120),
  "aciklama" text,
  "icerik" varchar(120),
  "talep_eden_kisi" varchar(120),
  "parti_no_fk" varchar(60),
  "durum" varchar(60),
  "gittigi_boyane" varchar(200),
  "gelen_mt" numeric(8,2),
  "gitme_tarihi" date,
  "gelme_tarihi" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid REFERENCES "users"("id")
);

CREATE INDEX "boyahane_top_no_idx" ON "boyahane_partileri" ("top_no");
CREATE INDEX "boyahane_numune_idx" ON "boyahane_partileri" ("numune_atilim_id");
CREATE INDEX "boyahane_durum_idx" ON "boyahane_partileri" ("durum");
CREATE INDEX "boyahane_talep_tarihi_idx" ON "boyahane_partileri" ("talep_tarihi");

-- Section 15'te eklenmiş top_no kolonu artık gerekli değil (boyahane_partileri taşıdı)
DROP INDEX IF EXISTS "numune_top_no_idx";
ALTER TABLE "numune_atilim" DROP COLUMN IF EXISTS "top_no";
