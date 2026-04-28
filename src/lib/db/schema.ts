import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  integer,
  numeric,
  boolean,
  timestamp,
  smallint,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    country: varchar("country", { length: 80 }),
    isInternal: boolean("is_internal").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("customers_name_unique").on(t.name)]
);

export const actionTypes = pgTable(
  "action_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nameTr: varchar("name_tr", { length: 120 }).notNull(),
    codeEn: varchar("code_en", { length: 60 }).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("action_types_code_unique").on(t.codeEn)]
);

export const argeTalepleri = pgTable(
  "arge_talepleri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordNo: varchar("record_no", { length: 20 }).notNull(),
    arrivalDate: date("arrival_date").notNull(),
    dueDate: date("due_date").notNull(),
    completionDate: date("completion_date"),
    customerId: uuid("customer_id").references(() => customers.id),
    fabricNameCode: varchar("fabric_name_code", { length: 200 }),
    variantCount: integer("variant_count"),
    requestedWidthCm: integer("requested_width_cm"),
    weightGsm: numeric("weight_gsm", { precision: 8, scale: 2 }),
    weaveType: varchar("weave_type", { length: 200 }),
    dyeType: varchar("dye_type", { length: 40 }),
    analysisStatus: varchar("analysis_status", { length: 40 }),
    labWorkStatus: varchar("lab_work_status", { length: 40 }),
    priceStatus: varchar("price_status", { length: 120 }),
    yarnStatus: varchar("yarn_status", { length: 40 }),
    yarnOrderStatus: varchar("yarn_order_status", { length: 60 }),
    warpStatus: varchar("warp_status", { length: 40 }),
    finishingProcess: text("finishing_process"),
    finalStatus: varchar("final_status", { length: 20 }).default("open").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    unique("arge_record_no_unique").on(t.recordNo),
    index("arge_due_date_idx").on(t.dueDate),
    index("arge_final_status_idx").on(t.finalStatus, t.dueDate),
  ]
);

export const hareketLog = pgTable(
  "hareket_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    logDate: date("log_date").defaultNow().notNull(),
    recordNo: varchar("record_no", { length: 20 })
      .notNull()
      .references(() => argeTalepleri.recordNo, { onDelete: "cascade" }),
    actionTypeId: uuid("action_type_id").references(() => actionTypes.id),
    description: text("description"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("hareket_log_record_date_idx").on(t.recordNo, t.logDate)]
);

export const numuneAtilim = pgTable(
  "numune_atilim",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    numuneNo: varchar("numune_no", { length: 30 }).notNull(),
    recordNo: varchar("record_no", { length: 20 }).references(
      () => argeTalepleri.recordNo,
      { onDelete: "set null" }
    ),
    date: date("date").notNull(),
    tezgah: varchar("tezgah", { length: 60 }),
    desen: varchar("desen", { length: 200 }),
    siklik: varchar("siklik", { length: 60 }),
    rapor: varchar("rapor", { length: 60 }),
    cozguAdi: text("cozgu_adi"),
    atki1: text("atki_1"),
    atki2: text("atki_2"),
    atki3: text("atki_3"),
    atki4: text("atki_4"),
    atki5: text("atki_5"),
    atki6: text("atki_6"),
    atki7: text("atki_7"),
    atki8: text("atki_8"),
    // İro = atkı motoru numarası (1-8). atki_N için iro_N hangi fiziksel iroya gidiyor.
    iro1: smallint("iro_1"),
    iro2: smallint("iro_2"),
    iro3: smallint("iro_3"),
    iro4: smallint("iro_4"),
    iro5: smallint("iro_5"),
    iro6: smallint("iro_6"),
    iro7: smallint("iro_7"),
    iro8: smallint("iro_8"),
    aciklama: text("aciklama"),
    // Üretim/KK çıktı alanları (varyant başına değil, numune bazında)
    // Top No artık boyahane_partileri'nde (Section 17 — bir numune → N top)
    kg: numeric("kg", { precision: 6, scale: 2 }),
    hamEn: integer("ham_en"),
    mamulEn: integer("mamul_en"),
    durum: varchar("durum", { length: 30 }).default("acik").notNull(),
    completionDate: date("completion_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    unique("numune_no_unique").on(t.numuneNo),
    index("numune_record_no_idx").on(t.recordNo),
    index("numune_date_idx").on(t.date),
    index("numune_durum_idx").on(t.durum),
  ]
);

export const boyahanePartileri = pgTable(
  "boyahane_partileri",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uniqSira: integer("uniq_sira"), // Excel orijinal sıra (idempotent import)
    satirDurumu: varchar("satir_durumu", { length: 20 }), // Açık / Kapalı
    topNo: varchar("top_no", { length: 60 }).notNull(), // D000082041
    dTry: varchar("d_try", { length: 60 }), // Excel ham değer (845, DA30303, "NUMUNE")
    numuneAtilimId: uuid("numune_atilim_id").references(
      () => numuneAtilim.id,
      { onDelete: "set null" }
    ),
    talepTarihi: date("talep_tarihi"),
    termin: date("termin"),
    en: integer("en"),
    istenenEn: integer("istenen_en"),
    metre: numeric("metre", { precision: 8, scale: 2 }),
    kilo: numeric("kilo", { precision: 8, scale: 2 }),
    desenNo: varchar("desen_no", { length: 120 }),
    yapilacakIslem: text("yapilacak_islem"),
    fasonFirma: varchar("fason_firma", { length: 120 }),
    aciklama: text("aciklama"),
    icerik: varchar("icerik", { length: 120 }),
    talepEdenKisi: varchar("talep_eden_kisi", { length: 120 }),
    // ERP'den gelecek alanlar (şimdilik manuel)
    partiNoFk: varchar("parti_no_fk", { length: 60 }),
    durum: varchar("durum", { length: 60 }),
    gittigiBoyane: varchar("gittigi_boyane", { length: 200 }),
    gelenMt: numeric("gelen_mt", { precision: 8, scale: 2 }),
    gitmeTarihi: date("gitme_tarihi"),
    gelmeTarihi: date("gelme_tarihi"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    index("boyahane_top_no_idx").on(t.topNo),
    index("boyahane_numune_idx").on(t.numuneAtilimId),
    index("boyahane_durum_idx").on(t.durum),
    index("boyahane_talep_tarihi_idx").on(t.talepTarihi),
  ]
);

export const numuneVaryant = pgTable(
  "numune_varyant",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    numuneAtilimId: uuid("numune_atilim_id")
      .notNull()
      .references(() => numuneAtilim.id, { onDelete: "cascade" }),
    varyantNo: varchar("varyant_no", { length: 10 }).notNull(),
    renk1: varchar("renk_1", { length: 100 }),
    renk2: varchar("renk_2", { length: 100 }),
    renk3: varchar("renk_3", { length: 100 }),
    renk4: varchar("renk_4", { length: 100 }),
    renk5: varchar("renk_5", { length: 100 }),
    renk6: varchar("renk_6", { length: 100 }),
    renk7: varchar("renk_7", { length: 100 }),
    renk8: varchar("renk_8", { length: 100 }),
    metre: numeric("metre", { precision: 6, scale: 1 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("numune_varyant_unique").on(t.numuneAtilimId, t.varyantNo),
    index("numune_varyant_atilim_idx").on(t.numuneAtilimId),
  ]
);

export const externalReferences = pgTable(
  "external_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordNo: varchar("record_no", { length: 20 })
      .notNull()
      .references(() => argeTalepleri.recordNo, { onDelete: "cascade" }),
    refType: varchar("ref_type", { length: 40 }).notNull(),
    refValue: varchar("ref_value", { length: 200 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("extref_record_idx").on(t.recordNo, t.refType)]
);

export const argeRelations = relations(argeTalepleri, ({ one, many }) => ({
  customer: one(customers, {
    fields: [argeTalepleri.customerId],
    references: [customers.id],
  }),
  creator: one(users, {
    fields: [argeTalepleri.createdBy],
    references: [users.id],
  }),
  logs: many(hareketLog),
  externalRefs: many(externalReferences),
  numuneler: many(numuneAtilim),
}));

export const numuneAtilimRelations = relations(numuneAtilim, ({ one, many }) => ({
  arge: one(argeTalepleri, {
    fields: [numuneAtilim.recordNo],
    references: [argeTalepleri.recordNo],
  }),
  varyantlar: many(numuneVaryant),
  partileri: many(boyahanePartileri),
  creator: one(users, {
    fields: [numuneAtilim.createdBy],
    references: [users.id],
  }),
}));

export const boyahanePartileriRelations = relations(
  boyahanePartileri,
  ({ one }) => ({
    numune: one(numuneAtilim, {
      fields: [boyahanePartileri.numuneAtilimId],
      references: [numuneAtilim.id],
    }),
    creator: one(users, {
      fields: [boyahanePartileri.createdBy],
      references: [users.id],
    }),
  })
);

export const numuneVaryantRelations = relations(numuneVaryant, ({ one }) => ({
  numune: one(numuneAtilim, {
    fields: [numuneVaryant.numuneAtilimId],
    references: [numuneAtilim.id],
  }),
}));

export const hareketLogRelations = relations(hareketLog, ({ one }) => ({
  arge: one(argeTalepleri, {
    fields: [hareketLog.recordNo],
    references: [argeTalepleri.recordNo],
  }),
  actionType: one(actionTypes, {
    fields: [hareketLog.actionTypeId],
    references: [actionTypes.id],
  }),
  creator: one(users, {
    fields: [hareketLog.createdBy],
    references: [users.id],
  }),
}));

export type ArgeTalebi = typeof argeTalepleri.$inferSelect;
export type NewArgeTalebi = typeof argeTalepleri.$inferInsert;
export type HareketLog = typeof hareketLog.$inferSelect;
export type NewHareketLog = typeof hareketLog.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type ActionType = typeof actionTypes.$inferSelect;
export type User = typeof users.$inferSelect;
export type NumuneAtilim = typeof numuneAtilim.$inferSelect;
export type NewNumuneAtilim = typeof numuneAtilim.$inferInsert;
export type NumuneVaryant = typeof numuneVaryant.$inferSelect;
export type NewNumuneVaryant = typeof numuneVaryant.$inferInsert;
export type BoyahaneParti = typeof boyahanePartileri.$inferSelect;
export type NewBoyahaneParti = typeof boyahanePartileri.$inferInsert;
