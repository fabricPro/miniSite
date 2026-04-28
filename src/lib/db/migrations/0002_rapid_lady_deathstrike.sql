CREATE TABLE "numune_atilim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numune_no" varchar(30) NOT NULL,
	"record_no" varchar(20),
	"date" date NOT NULL,
	"tezgah" varchar(30),
	"desen" varchar(60),
	"siklik" varchar(30),
	"rapor" varchar(30),
	"cozgu_adi" text,
	"atki_1" text,
	"atki_2" text,
	"atki_3" text,
	"atki_4" text,
	"atki_5" text,
	"aciklama" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "numune_no_unique" UNIQUE("numune_no")
);
--> statement-breakpoint
CREATE TABLE "numune_varyant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numune_atilim_id" uuid NOT NULL,
	"varyant_no" varchar(10) NOT NULL,
	"renk_1" varchar(100),
	"renk_2" varchar(100),
	"renk_3" varchar(100),
	"renk_4" varchar(100),
	"renk_5" varchar(100),
	"metre" numeric(6, 1),
	"kg" numeric(6, 2),
	"ham_en" integer,
	"mamul_en" integer,
	"durum" varchar(30) DEFAULT 'acik' NOT NULL,
	"completion_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "numune_varyant_unique" UNIQUE("numune_atilim_id","varyant_no")
);
--> statement-breakpoint
ALTER TABLE "numune_atilim" ADD CONSTRAINT "numune_atilim_record_no_arge_talepleri_record_no_fk" FOREIGN KEY ("record_no") REFERENCES "public"."arge_talepleri"("record_no") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "numune_atilim" ADD CONSTRAINT "numune_atilim_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "numune_varyant" ADD CONSTRAINT "numune_varyant_numune_atilim_id_numune_atilim_id_fk" FOREIGN KEY ("numune_atilim_id") REFERENCES "public"."numune_atilim"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "numune_record_no_idx" ON "numune_atilim" USING btree ("record_no");--> statement-breakpoint
CREATE INDEX "numune_date_idx" ON "numune_atilim" USING btree ("date");--> statement-breakpoint
CREATE INDEX "numune_varyant_atilim_idx" ON "numune_varyant" USING btree ("numune_atilim_id");--> statement-breakpoint
CREATE INDEX "numune_varyant_durum_idx" ON "numune_varyant" USING btree ("durum");