import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { NumuneAtilim, NumuneVaryant } from "@/lib/db/schema";
import { numuneDurumLabels, type NumuneDurum } from "../labels";

// ─── Font registration: Türkçe karakter (ı, ğ, ş, ç, İ, Ü, Ö) ─────
// Geist-Regular TTF — public/fonts/'tan yükleniyor. Helvetica default'u
// `ı` gibi karakterleri 1'e çeviriyor (woff CDN'leri de aynı sorunu yapıyor).
// Bold için aynı dosya kullanılıyor (synthetic bold rendering).
const FONT_DIR = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "Geist",
  fonts: [
    {
      src: path.join(FONT_DIR, "Geist-Regular.ttf"),
      fontWeight: 400,
    },
    {
      src: path.join(FONT_DIR, "Geist-Regular.ttf"),
      fontWeight: 700,
    },
  ],
});

const COLORS = {
  border: "#cbd5e1",
  borderDark: "#475569",
  muted: "#64748b",
  text: "#0f172a",
  bgMuted: "#f1f5f9",
  bgRow: "#f8fafc",
  primary: "#4f46e5",
};

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontFamily: "Geist",
    fontSize: 9,
    color: COLORS.text,
  },
  // Üst başlık çubuğu
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1,
    color: COLORS.primary,
  },
  brandSub: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  topMeta: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
  },

  // İki kolonlu ana yapı
  twoCol: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  leftCol: {
    width: "50%",
  },
  rightCol: {
    width: "50%",
  },

  // Bilgi kutusu
  infoBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  infoBoxTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.muted,
    backgroundColor: COLORS.bgMuted,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoBoxBody: {
    padding: 6,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  infoLabel: {
    width: 65,
    fontSize: 8,
    color: COLORS.muted,
    fontWeight: 700,
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
  },

  // Durum vurgusu
  statusPill: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 700,
    color: "#ffffff",
  },

  // Atki listesi
  atkiRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  atkiNum: {
    width: 14,
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.muted,
  },
  atkiText: {
    flex: 1,
    fontSize: 9,
  },

  // Çözgü kutusu
  cozguBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 6,
    marginBottom: 6,
  },
  cozguLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.muted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cozguText: {
    fontSize: 9,
    lineHeight: 1.3,
  },

  // Variant tablosu
  table: {
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 2,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  th: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.muted,
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  thLast: {
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 16,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bgRow,
  },
  td: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tdLast: {
    borderRightWidth: 0,
  },
  tdVarNo: {
    fontWeight: 700,
    color: COLORS.primary,
  },
  tdMetre: {
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },

  // KK + Açıklama bölümü
  kkBox: {
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 4,
    marginTop: 8,
  },
  kkRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  kkRowLast: {
    borderBottomWidth: 0,
  },
  kkCell: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    minHeight: 20,
  },
  kkCellLast: {
    borderRightWidth: 0,
  },
  kkLabel: {
    fontSize: 7.5,
    fontWeight: 700,
    color: COLORS.muted,
    textTransform: "uppercase",
    width: 55,
  },
  kkValue: {
    flex: 1,
    fontSize: 9,
  },
  aciklamaCell: {
    minHeight: 36,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 14,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  pageNum: {},
});

const DURUM_COLORS: Record<NumuneDurum, string> = {
  acik: "#64748b",
  dokumada: "#4f46e5",
  kalite_kontrolde: "#f59e0b",
  tamamlandi: "#16a34a",
  iptal: "#94a3b8",
};

interface Props {
  numune: NumuneAtilim;
  customerName: string | null;
  varyantlar: NumuneVaryant[];
}

const ATKI_KEYS = [
  "atki1",
  "atki2",
  "atki3",
  "atki4",
  "atki5",
  "atki6",
  "atki7",
  "atki8",
] as const;

const IRO_KEYS = [
  "iro1",
  "iro2",
  "iro3",
  "iro4",
  "iro5",
  "iro6",
  "iro7",
  "iro8",
] as const;

const RENK_KEYS = [
  "renk1",
  "renk2",
  "renk3",
  "renk4",
  "renk5",
  "renk6",
  "renk7",
  "renk8",
] as const;

function formatTRDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

function activeAtkiCount(numune: NumuneAtilim): number {
  let count = 1;
  for (let i = ATKI_KEYS.length - 1; i >= 0; i--) {
    const v = numune[ATKI_KEYS[i]];
    if (v != null && String(v).trim() !== "") {
      count = i + 1;
      break;
    }
  }
  return Math.max(1, count);
}

export function NumuneFormPDF({ numune, customerName, varyantlar }: Props) {
  // İro sıralaması: dolu atki'ları iro numarasına göre sırala.
  // Aynı iro birden fazla atki'da varsa sıralama atki slot indeksine göre
  // ikincil tie-breaker. İro atanmamışsa listenin sonuna düşer.
  const iroEntries: {
    iro: number | null;
    atki: string;
    slot: number; // 1-based atki slot
  }[] = [];
  ATKI_KEYS.forEach((k, i) => {
    const v = numune[k];
    if (v != null && String(v).trim() !== "") {
      const iroVal = numune[IRO_KEYS[i]] as number | null | undefined;
      iroEntries.push({
        iro: iroVal ?? null,
        atki: String(v),
        slot: i + 1,
      });
    }
  });
  iroEntries.sort((a, b) => {
    const aIro = a.iro ?? 99;
    const bIro = b.iro ?? 99;
    if (aIro !== bIro) return aIro - bIro;
    return a.slot - b.slot;
  });

  // Duplicate iro detection (PDF'te uyarı yıldızı için)
  const iroCounts = new Map<number, number>();
  iroEntries.forEach((e) => {
    if (e.iro != null) iroCounts.set(e.iro, (iroCounts.get(e.iro) ?? 0) + 1);
  });
  const dupIros = new Set(
    Array.from(iroCounts.entries())
      .filter(([, n]) => n > 1)
      .map(([k]) => k)
  );

  const renkColCount = activeAtkiCount(numune);
  const visibleRenks = RENK_KEYS.slice(0, renkColCount);

  const durum = (numune.durum as NumuneDurum) ?? "acik";
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, "0")}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${today.getFullYear()}`;

  // Variant table column widths (yaklaşık eşit dağılım)
  const varNoWidth = 10; // %
  const metreWidth = 12; // %
  const renkColWidth = (100 - varNoWidth - metreWidth) / Math.max(1, renkColCount); // %

  return (
    <Document
      title={`Numune ${numune.numuneNo}`}
      author="Numune Master"
      subject="Numune atılım formu"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Üst başlık */}
        <View style={styles.topHeader} fixed>
          <View>
            <Text style={styles.brand}>NUMUNE MASTER</Text>
            <Text style={styles.brandSub}>Numune Atılım Formu</Text>
          </View>
          <View>
            <Text style={styles.topMeta}>Çıktı tarihi: {todayStr}</Text>
            <Text style={styles.topMeta}>{numune.numuneNo}</Text>
          </View>
        </View>

        {/* Üst bilgiler — iki kolon */}
        <View style={styles.twoCol}>
          {/* Sol: kimlik */}
          <View style={styles.leftCol}>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Numune Bilgileri</Text>
              <View style={styles.infoBoxBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Numune No</Text>
                  <Text style={[styles.infoValue, { fontWeight: 700 }]}>
                    {numune.numuneNo}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tarih</Text>
                  <Text style={styles.infoValue}>
                    {formatTRDate(numune.date)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tezgah</Text>
                  <Text style={styles.infoValue}>{numune.tezgah ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Desen</Text>
                  <Text style={styles.infoValue}>{numune.desen ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sıklık</Text>
                  <Text style={styles.infoValue}>{numune.siklik ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rapor</Text>
                  <Text style={styles.infoValue}>{numune.rapor ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>CSR</Text>
                  <Text style={styles.infoValue}>
                    {numune.recordNo
                      ? `${numune.recordNo}${
                          customerName ? ` · ${customerName}` : ""
                        }`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Durum</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.statusPill,
                        { backgroundColor: DURUM_COLORS[durum] },
                      ]}
                    >
                      {numuneDurumLabels[durum]}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Sağ: İro Sıralaması (atkı + iro eşlemesi, iroya göre sıralı) */}
          <View style={styles.rightCol}>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>İro Sıralaması</Text>
              <View style={styles.infoBoxBody}>
                {iroEntries.length === 0 ? (
                  <Text style={{ color: COLORS.muted, fontSize: 8 }}>
                    Atkı bilgisi yok
                  </Text>
                ) : (
                  iroEntries.map((e, idx) => {
                    const isDup = e.iro != null && dupIros.has(e.iro);
                    return (
                      <View
                        key={`${e.slot}-${idx}`}
                        style={styles.atkiRow}
                      >
                        <Text
                          style={[
                            styles.atkiNum,
                            {
                              width: 38,
                              color: isDup ? "#b45309" : COLORS.primary,
                            },
                          ]}
                        >
                          {e.iro != null ? `İro ${e.iro}` : "İro —"}
                          {isDup ? " *" : ""}
                        </Text>
                        <Text style={styles.atkiText}>{e.atki}</Text>
                      </View>
                    );
                  })
                )}
                {dupIros.size > 0 && (
                  <Text
                    style={{
                      color: "#b45309",
                      fontSize: 7,
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    * Aynı iro birden fazla atkıda kullanılıyor
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Çözgü ipi — full width */}
        <View style={styles.cozguBox}>
          <Text style={styles.cozguLabel}>Çözgü İpi</Text>
          <Text style={styles.cozguText}>
            {numune.cozguAdi && numune.cozguAdi.trim() !== ""
              ? numune.cozguAdi
              : "—"}
          </Text>
        </View>

        {/* Variant tablosu */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text
              style={[styles.th, { width: `${varNoWidth}%` }]}
            >
              Varyant
            </Text>
            {visibleRenks.map((_, i) => (
              <Text
                key={i}
                style={[styles.th, { width: `${renkColWidth}%` }]}
              >
                Renk {i + 1}
              </Text>
            ))}
            <Text
              style={[
                styles.th,
                styles.thLast,
                { width: `${metreWidth}%`, textAlign: "right" },
              ]}
            >
              Metre
            </Text>
          </View>
          {varyantlar.length === 0 ? (
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.td,
                  styles.tdLast,
                  { width: "100%", color: COLORS.muted, textAlign: "center" },
                ]}
              >
                Varyant yok
              </Text>
            </View>
          ) : (
            varyantlar.map((v, idx) => (
              <View
                key={v.id}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowAlt : {},
                ]}
                wrap={false}
              >
                <Text
                  style={[
                    styles.td,
                    styles.tdVarNo,
                    { width: `${varNoWidth}%` },
                  ]}
                >
                  {v.varyantNo}
                </Text>
                {visibleRenks.map((rk) => (
                  <Text
                    key={rk}
                    style={[styles.td, { width: `${renkColWidth}%` }]}
                  >
                    {(v[rk] as string | null) ?? "—"}
                  </Text>
                ))}
                <Text
                  style={[
                    styles.td,
                    styles.tdLast,
                    styles.tdMetre,
                    { width: `${metreWidth}%` },
                  ]}
                >
                  {v.metre != null ? `${v.metre} MT` : "—"}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Üretim / Kalite Kontrol — KG, Ham En, Mamül En + Açıklama
            (Top No artık boyahane modülünde — bir numune'den çıkan her top
            ayrı parti) */}
        <View style={styles.kkBox} wrap={false}>
          <View style={styles.kkRow}>
            <View style={styles.kkCell}>
              <Text style={styles.kkLabel}>KG</Text>
              <Text style={styles.kkValue}>
                {numune.kg != null ? String(numune.kg) : "—"}
              </Text>
            </View>
            <View style={styles.kkCell}>
              <Text style={styles.kkLabel}>Ham En</Text>
              <Text style={styles.kkValue}>
                {numune.hamEn != null ? `${numune.hamEn} cm` : "—"}
              </Text>
            </View>
            <View style={[styles.kkCell, styles.kkCellLast]}>
              <Text style={styles.kkLabel}>Mamül En</Text>
              <Text style={styles.kkValue}>
                {numune.mamulEn != null ? `${numune.mamulEn} cm` : "—"}
              </Text>
            </View>
          </View>
          <View style={[styles.kkRow, styles.kkRowLast]}>
            <View
              style={[
                styles.kkCell,
                styles.kkCellLast,
                styles.aciklamaCell,
              ]}
            >
              <Text style={styles.kkLabel}>Açıklama</Text>
              <Text style={styles.kkValue}>
                {numune.aciklama && numune.aciklama.trim() !== ""
                  ? numune.aciklama
                  : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            {numune.numuneNo} · {formatTRDate(numune.date)}
          </Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) =>
              `Sayfa ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
