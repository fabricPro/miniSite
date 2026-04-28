CREATE TABLE "action_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_tr" varchar(120) NOT NULL,
	"code_en" varchar(60) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_types_code_unique" UNIQUE("code_en")
);
--> statement-breakpoint
CREATE TABLE "arge_talepleri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_no" varchar(20) NOT NULL,
	"arrival_date" date NOT NULL,
	"due_date" date NOT NULL,
	"completion_date" date,
	"customer_id" uuid,
	"fabric_name_code" varchar(200),
	"variant_count" integer,
	"requested_width_cm" integer,
	"weight_gsm" numeric(8, 2),
	"weave_type" varchar(200),
	"dye_type" varchar(40),
	"analysis_status" varchar(40),
	"lab_work_status" varchar(40),
	"price_status" varchar(120),
	"yarn_status" varchar(40),
	"warp_status" varchar(40),
	"finishing_process" text,
	"final_status" varchar(20) DEFAULT 'open' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "arge_record_no_unique" UNIQUE("record_no")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"country" varchar(80),
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "external_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_no" varchar(20) NOT NULL,
	"ref_type" varchar(40) NOT NULL,
	"ref_value" varchar(200) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hareket_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"log_date" date DEFAULT now() NOT NULL,
	"record_no" varchar(20) NOT NULL,
	"action_type_id" uuid,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "arge_talepleri" ADD CONSTRAINT "arge_talepleri_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arge_talepleri" ADD CONSTRAINT "arge_talepleri_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_references" ADD CONSTRAINT "external_references_record_no_arge_talepleri_record_no_fk" FOREIGN KEY ("record_no") REFERENCES "public"."arge_talepleri"("record_no") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareket_log" ADD CONSTRAINT "hareket_log_record_no_arge_talepleri_record_no_fk" FOREIGN KEY ("record_no") REFERENCES "public"."arge_talepleri"("record_no") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareket_log" ADD CONSTRAINT "hareket_log_action_type_id_action_types_id_fk" FOREIGN KEY ("action_type_id") REFERENCES "public"."action_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hareket_log" ADD CONSTRAINT "hareket_log_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arge_due_date_idx" ON "arge_talepleri" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "arge_final_status_idx" ON "arge_talepleri" USING btree ("final_status","due_date");--> statement-breakpoint
CREATE INDEX "extref_record_idx" ON "external_references" USING btree ("record_no","ref_type");--> statement-breakpoint
CREATE INDEX "hareket_log_record_date_idx" ON "hareket_log" USING btree ("record_no","log_date");