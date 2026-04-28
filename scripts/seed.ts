import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/db/client";
import { users, customers, actionTypes } from "../src/lib/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { eq } from "drizzle-orm";

const CUSTOMERS = [
  { name: "DİVA DESİGN", country: "Türkiye", isInternal: false },
  { name: "GIDA HOME", country: "Türkiye", isInternal: false },
  { name: "DSG", country: "Türkiye", isInternal: false },
  { name: "LARIC", country: "Türkiye", isInternal: false },
  { name: "AMC", country: "Türkiye", isInternal: false },
  { name: "LAVERDE", country: "Türkiye", isInternal: false },
  { name: "DEGRAPE", country: "Türkiye", isInternal: false },
  { name: "NUKA", country: "Türkiye", isInternal: false },
  { name: "TOPPOİNT", country: "Türkiye", isInternal: false },
  { name: "AR-GE", country: "Türkiye", isInternal: true },
  { name: "CREATİVE", country: "Türkiye", isInternal: false },
  { name: "FAİRLEE", country: "Türkiye", isInternal: false },
  { name: "ANKARA TEKSTİL", country: "Türkiye", isInternal: false },
];

const ACTION_TYPES = [
  { nameTr: "ANALİZ YAPILDI", codeEn: "analysis_done" },
  { nameTr: "BEKLEMEDE", codeEn: "waiting" },
  { nameTr: "LAB ÇALIŞMASI YAPILDI", codeEn: "lab_work_done" },
  { nameTr: "MÜŞTERİ ONAYI BEKLENİYOR", codeEn: "awaiting_customer_approval" },
  { nameTr: "MÜŞTERİ ONAYLADI", codeEn: "customer_approved" },
  { nameTr: "İPLİK SİPARİŞİ GEÇİLDİ", codeEn: "yarn_ordered" },
  { nameTr: "İPLİK TALEBİ GEÇİLDİ", codeEn: "yarn_requested" },
  { nameTr: "ATKI İPLİĞİ GELDİ", codeEn: "weft_yarn_arrived" },
  { nameTr: "ÇÖZGÜ TALEBİ GEÇİLDİ", codeEn: "warp_requested" },
  { nameTr: "ÇÖZGÜ HAZIRLANIYOR", codeEn: "warp_in_preparation" },
  { nameTr: "ÇÖZGÜ GÖNDERİLDİ", codeEn: "warp_sent" },
  { nameTr: "TAHAR DEĞİŞİMİ BEKLENİYOR", codeEn: "awaiting_drawing_change" },
  { nameTr: "İPLİK BEKLENİYOR", codeEn: "awaiting_yarn" },
  { nameTr: "NUMUNE DOKUNDU", codeEn: "sample_woven" },
  { nameTr: "BİTİŞ İŞLEMİ YAPILDI", codeEn: "finishing_done" },
  { nameTr: "TEKRAR NUMUNE YAPILACAK", codeEn: "sample_to_be_redone" },
];

async function main() {
  console.log("→ Seed başlıyor...");

  // 1. Admin kullanıcı (idempotent)
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@numune.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

  const [existingAdmin] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword);
    await db.insert(users).values({
      email: adminEmail,
      name: "Admin",
      passwordHash,
      isActive: true,
    });
    console.log(`✓ Admin oluşturuldu: ${adminEmail} / ${adminPassword}`);
    console.log("  (İlk girişten sonra şifreni değiştir!)");
  } else {
    console.log(`· Admin zaten var: ${adminEmail}`);
  }

  // 2. Müşteriler (idempotent)
  for (const c of CUSTOMERS) {
    const [existing] = await db
      .select()
      .from(customers)
      .where(eq(customers.name, c.name))
      .limit(1);
    if (!existing) {
      await db.insert(customers).values(c);
    }
  }
  console.log(`✓ ${CUSTOMERS.length} müşteri senkronize edildi`);

  // 3. İşlem tipleri (idempotent)
  for (let i = 0; i < ACTION_TYPES.length; i++) {
    const a = ACTION_TYPES[i];
    const [existing] = await db
      .select()
      .from(actionTypes)
      .where(eq(actionTypes.codeEn, a.codeEn))
      .limit(1);
    if (!existing) {
      await db.insert(actionTypes).values({
        ...a,
        sortOrder: i,
        isSystem: true,
      });
    }
  }
  console.log(`✓ ${ACTION_TYPES.length} işlem tipi senkronize edildi`);

  console.log("\n✓ Seed tamamlandı.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Seed hatası:", err);
  process.exit(1);
});
