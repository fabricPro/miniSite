import Link from "next/link";
import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Activity,
  LayoutDashboard,
  Package2,
  Loader,
  CheckCheck,
  PackageOpen,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db/client";
import {
  actionTypes,
  argeTalepleri,
  boyahanePartileri,
  customers,
  hareketLog,
  numuneAtilim,
  users,
} from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTR, formatTRLong } from "@/lib/utils/dates";

export const metadata = { title: "Pano — Numune Master" };

async function getDashboardData() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const weekAheadIso = weekAhead.toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString().slice(0, 10);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoIso = twoWeeksAgo.toISOString().slice(0, 10);

  const [
    openCountRow,
    closedCountRow,
    overdueCountRow,
    thisWeekCountRow,
    totalLogsRow,
    overdueList,
    thisWeekList,
    recentLogs,
    topActionTypes,
    // ─── BOYAHANE ───
    boyaneIslemdeRow,
    boyaneTalimatRow,
    boyaneGelmisHaftaRow,
    boyaneGecKalanRow,
    boyaneGecKalanList,
    boyaneRecentReturned,
    boyaneFasonStats,
  ] = await Promise.all([
    // 1. Açık sayısı
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(argeTalepleri)
      .where(eq(argeTalepleri.finalStatus, "open")),
    // 2. Kapalı sayısı
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(argeTalepleri)
      .where(eq(argeTalepleri.finalStatus, "closed")),
    // 3. Geciken: due_date < today AND not completed AND open
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(argeTalepleri)
      .where(
        and(
          eq(argeTalepleri.finalStatus, "open"),
          isNull(argeTalepleri.completionDate),
          lte(argeTalepleri.dueDate, today)
        )
      ),
    // 4. Bu hafta termin: today <= due <= today+7 AND open
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(argeTalepleri)
      .where(
        and(
          eq(argeTalepleri.finalStatus, "open"),
          isNull(argeTalepleri.completionDate),
          gte(argeTalepleri.dueDate, today),
          lte(argeTalepleri.dueDate, weekAheadIso)
        )
      ),
    // 5. Toplam log
    db.select({ count: sql<number>`count(*)::int` }).from(hareketLog),
    // 6. Gecikenler (liste, max 10)
    db
      .select({
        recordNo: argeTalepleri.recordNo,
        customerName: customers.name,
        dueDate: argeTalepleri.dueDate,
        fabricNameCode: argeTalepleri.fabricNameCode,
      })
      .from(argeTalepleri)
      .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
      .where(
        and(
          eq(argeTalepleri.finalStatus, "open"),
          isNull(argeTalepleri.completionDate),
          lte(argeTalepleri.dueDate, today)
        )
      )
      .orderBy(asc(argeTalepleri.dueDate))
      .limit(10),
    // 7. Bu hafta termin listesi (max 10)
    db
      .select({
        recordNo: argeTalepleri.recordNo,
        customerName: customers.name,
        dueDate: argeTalepleri.dueDate,
        fabricNameCode: argeTalepleri.fabricNameCode,
      })
      .from(argeTalepleri)
      .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
      .where(
        and(
          eq(argeTalepleri.finalStatus, "open"),
          isNull(argeTalepleri.completionDate),
          gte(argeTalepleri.dueDate, today),
          lte(argeTalepleri.dueDate, weekAheadIso)
        )
      )
      .orderBy(asc(argeTalepleri.dueDate))
      .limit(10),
    // 8. Son işlemler (max 10)
    db
      .select({
        id: hareketLog.id,
        logDate: hareketLog.logDate,
        recordNo: hareketLog.recordNo,
        actionTypeNameTr: actionTypes.nameTr,
        description: hareketLog.description,
        creatorName: users.name,
      })
      .from(hareketLog)
      .leftJoin(actionTypes, eq(actionTypes.id, hareketLog.actionTypeId))
      .leftJoin(users, eq(users.id, hareketLog.createdBy))
      .orderBy(desc(hareketLog.logDate), desc(hareketLog.createdAt))
      .limit(10),
    // 9. Sık kullanılan işlem tipleri (top 5, son 90 günde)
    db
      .select({
        nameTr: actionTypes.nameTr,
        count: sql<number>`count(*)::int`,
      })
      .from(hareketLog)
      .innerJoin(actionTypes, eq(actionTypes.id, hareketLog.actionTypeId))
      .where(
        gte(
          hareketLog.logDate,
          new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
        )
      )
      .groupBy(actionTypes.nameTr)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
    // ─── BOYAHANE STATS ───
    // 10. Boyahanede işlemde olan
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(boyahanePartileri)
      .where(eq(boyahanePartileri.durum, "islemde")),
    // 11. Talimat atılmış (henüz boyahaneye gitmemiş)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(boyahanePartileri)
      .where(eq(boyahanePartileri.durum, "talimat_atildi")),
    // 12. Bu hafta dönenler (gelme_tarihi son 7 gün)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(boyahanePartileri)
      .where(
        and(
          eq(boyahanePartileri.durum, "islemden_gelmis"),
          gte(boyahanePartileri.gelmeTarihi, weekAgoIso)
        )
      ),
    // 13. Geç kalan (talep_tarihi 14+ gün önce, hâlâ gelmemiş)
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(boyahanePartileri)
      .where(
        and(
          sql`${boyahanePartileri.durum} != 'islemden_gelmis'`,
          sql`${boyahanePartileri.durum} != 'islemden_iade'`,
          lte(boyahanePartileri.talepTarihi, twoWeeksAgoIso)
        )
      ),
    // 14. Geç kalan top'lar listesi (max 10)
    db
      .select({
        id: boyahanePartileri.id,
        topNo: boyahanePartileri.topNo,
        talepTarihi: boyahanePartileri.talepTarihi,
        yapilacakIslem: boyahanePartileri.yapilacakIslem,
        fasonFirma: boyahanePartileri.fasonFirma,
        durum: boyahanePartileri.durum,
        numuneNo: numuneAtilim.numuneNo,
      })
      .from(boyahanePartileri)
      .leftJoin(
        numuneAtilim,
        eq(numuneAtilim.id, boyahanePartileri.numuneAtilimId)
      )
      .where(
        and(
          sql`${boyahanePartileri.durum} != 'islemden_gelmis'`,
          sql`${boyahanePartileri.durum} != 'islemden_iade'`,
          lte(boyahanePartileri.talepTarihi, twoWeeksAgoIso)
        )
      )
      .orderBy(asc(boyahanePartileri.talepTarihi))
      .limit(10),
    // 15. Bu hafta dönen top'lar listesi (max 10)
    db
      .select({
        id: boyahanePartileri.id,
        topNo: boyahanePartileri.topNo,
        gelmeTarihi: boyahanePartileri.gelmeTarihi,
        yapilacakIslem: boyahanePartileri.yapilacakIslem,
        fasonFirma: boyahanePartileri.fasonFirma,
        gelenMt: boyahanePartileri.gelenMt,
        numuneNo: numuneAtilim.numuneNo,
      })
      .from(boyahanePartileri)
      .leftJoin(
        numuneAtilim,
        eq(numuneAtilim.id, boyahanePartileri.numuneAtilimId)
      )
      .where(
        and(
          eq(boyahanePartileri.durum, "islemden_gelmis"),
          gte(boyahanePartileri.gelmeTarihi, weekAgoIso)
        )
      )
      .orderBy(desc(boyahanePartileri.gelmeTarihi))
      .limit(10),
    // 16. Fason firma istatistikleri (top 5, son 30 gün)
    db
      .select({
        fasonFirma: boyahanePartileri.fasonFirma,
        count: sql<number>`count(*)::int`,
      })
      .from(boyahanePartileri)
      .where(
        and(
          gte(
            boyahanePartileri.talepTarihi,
            new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
          ),
          sql`${boyahanePartileri.fasonFirma} IS NOT NULL`
        )
      )
      .groupBy(boyahanePartileri.fasonFirma)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);

  return {
    open: openCountRow[0]?.count ?? 0,
    closed: closedCountRow[0]?.count ?? 0,
    overdue: overdueCountRow[0]?.count ?? 0,
    thisWeek: thisWeekCountRow[0]?.count ?? 0,
    totalLogs: totalLogsRow[0]?.count ?? 0,
    overdueList,
    thisWeekList,
    recentLogs,
    topActionTypes,
    // Boyahane
    boyaneIslemde: boyaneIslemdeRow[0]?.count ?? 0,
    boyaneTalimat: boyaneTalimatRow[0]?.count ?? 0,
    boyaneGelmisHafta: boyaneGelmisHaftaRow[0]?.count ?? 0,
    boyaneGecKalan: boyaneGecKalanRow[0]?.count ?? 0,
    boyaneGecKalanList,
    boyaneRecentReturned,
    boyaneFasonStats,
  };
}

export default async function DashboardPage() {
  let data;
  try {
    data = await getDashboardData();
  } catch (err) {
    console.error("Dashboard veri hatası:", err);
    data = {
      open: 0,
      closed: 0,
      overdue: 0,
      thisWeek: 0,
      totalLogs: 0,
      overdueList: [],
      thisWeekList: [],
      recentLogs: [],
      topActionTypes: [],
      boyaneIslemde: 0,
      boyaneTalimat: 0,
      boyaneGelmisHafta: 0,
      boyaneGecKalan: 0,
      boyaneGecKalanList: [],
      boyaneRecentReturned: [],
      boyaneFasonStats: [],
    };
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={LayoutDashboard}
        accent="var(--primary)"
        title="Pano"
        description={`R&D departmanı genel özet · ${formatTRLong(new Date())}`}
        actions={
          <Button
            variant="outline"
            size="sm"
            render={<a href="/api/export/excel" />}
          >
            <Download className="h-4 w-4" />
            Excel&apos;e aktar
          </Button>
        }
      />

      {/* Özet kartları */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Açık Ar-Ge"
          value={data.open}
          icon={<FolderOpen className="h-4 w-4" />}
          accent="var(--mod-arge)"
        />
        <StatCard
          label="Geciken"
          value={data.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={
            data.overdue > 0 ? "var(--destructive)" : "var(--muted-foreground)"
          }
          urgent={data.overdue > 0}
        />
        <StatCard
          label="Bu hafta termin"
          value={data.thisWeek}
          icon={<CalendarClock className="h-4 w-4" />}
          accent={
            data.thisWeek > 0 ? "var(--warning)" : "var(--muted-foreground)"
          }
        />
        <StatCard
          label="Tamamlanan"
          value={data.closed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="var(--success)"
        />
      </div>

      {/* Geciken + Bu hafta termin */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4"
                style={{ color: "var(--destructive)" }}
              />
              Geciken Kayıtlar
            </CardTitle>
            <Badge variant="outline">{data.overdue}</Badge>
          </CardHeader>
          <CardContent>
            {data.overdueList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Geciken kayıt yok 🎉
              </p>
            ) : (
              <RecordList items={data.overdueList} tone="red" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarClock
                className="h-4 w-4"
                style={{ color: "var(--warning)" }}
              />
              Bu Hafta Termin
            </CardTitle>
            <Badge variant="outline">{data.thisWeek}</Badge>
          </CardHeader>
          <CardContent>
            {data.thisWeekList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Bu hafta terminli açık kayıt yok.
              </p>
            ) : (
              <RecordList items={data.thisWeekList} tone="amber" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── BOYAHANE BÖLÜMÜ ─── */}
      <div className="pt-4 flex items-center gap-2">
        <div
          className="grid place-items-center h-7 w-7 rounded-lg shrink-0"
          style={{
            background:
              "color-mix(in oklch, var(--mod-boyane) 14%, transparent)",
            boxShadow:
              "inset 0 0 0 1px color-mix(in oklch, var(--mod-boyane) 22%, transparent), 0 0 12px -4px color-mix(in oklch, var(--mod-boyane) 30%, transparent)",
          }}
        >
          <Package2
            className="h-4 w-4"
            style={{ color: "var(--mod-boyane)" }}
          />
        </div>
        <h3 className="text-lg font-bold tracking-tight">Boyahane</h3>
        <Link
          href="/boyahane"
          className="ml-auto text-xs hover:underline"
          style={{ color: "var(--mod-boyane)" }}
        >
          Tümünü gör →
        </Link>
      </div>

      {/* Boyahane stat kartları */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="İşlemde"
          value={data.boyaneIslemde}
          icon={<Loader className="h-4 w-4" />}
          accent="var(--mod-boyane)"
        />
        <StatCard
          label="Talimat Atıldı"
          value={data.boyaneTalimat}
          icon={<PackageOpen className="h-4 w-4" />}
          accent="var(--info)"
        />
        <StatCard
          label="Bu hafta dönen"
          value={data.boyaneGelmisHafta}
          icon={<CheckCheck className="h-4 w-4" />}
          accent="var(--success)"
        />
        <StatCard
          label="Geç kalan"
          value={data.boyaneGecKalan}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={
            data.boyaneGecKalan > 0
              ? "var(--destructive)"
              : "var(--muted-foreground)"
          }
          urgent={data.boyaneGecKalan > 0}
        />
      </div>

      {/* Boyahane geç kalan + son dönenler */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4"
                style={{ color: "var(--destructive)" }}
              />
              Geç Kalan Top&apos;lar
              <span className="text-[10px] font-normal text-muted-foreground">
                (14+ gün)
              </span>
            </CardTitle>
            <Badge variant="outline">{data.boyaneGecKalan}</Badge>
          </CardHeader>
          <CardContent>
            {data.boyaneGecKalanList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Geç kalan top yok 🎉
              </p>
            ) : (
              <BoyaneList items={data.boyaneGecKalanList} mode="overdue" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCheck
                className="h-4 w-4"
                style={{ color: "var(--success)" }}
              />
              Bu Hafta Dönenler
            </CardTitle>
            <Badge variant="outline">{data.boyaneGelmisHafta}</Badge>
          </CardHeader>
          <CardContent>
            {data.boyaneRecentReturned.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Bu hafta dönen top yok.
              </p>
            ) : (
              <BoyaneList items={data.boyaneRecentReturned} mode="returned" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fason firma istatistikleri */}
      {data.boyaneFasonStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package2
                className="h-4 w-4"
                style={{ color: "var(--mod-boyane)" }}
              />
              Fason Firma Dağılımı
            </CardTitle>
            <p className="text-xs text-muted-foreground">Son 30 gün</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {data.boyaneFasonStats.map((f) => (
                <div
                  key={f.fasonFirma ?? ""}
                  className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {f.fasonFirma}
                    </p>
                    <p className="text-[10px] text-muted-foreground">parti</p>
                  </div>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: "var(--mod-boyane)" }}
                  >
                    {f.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Son hareketler + sık işlem tipleri */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity
                className="h-4 w-4"
                style={{ color: "var(--mod-arge)" }}
              />
              Son Hareketler
            </CardTitle>
            <Badge variant="outline">{data.totalLogs} toplam</Badge>
          </CardHeader>
          <CardContent>
            {data.recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Henüz hareket kaydı yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.recentLogs.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 rounded-md border bg-card p-2.5 text-sm"
                  >
                    <span className="tabular-nums text-xs text-muted-foreground shrink-0 w-14 pt-0.5">
                      {formatTR(log.logDate)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/arge?csr=${log.recordNo}`}
                          className="font-mono text-xs font-semibold hover:underline shrink-0"
                          style={{ color: "var(--mod-arge)" }}
                        >
                          {log.recordNo}
                        </Link>
                        {log.actionTypeNameTr && (
                          <span className="font-medium text-xs truncate">
                            {log.actionTypeNameTr}
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {log.description}
                        </p>
                      )}
                    </div>
                    {log.creatorName && (
                      <span className="text-[11px] text-muted-foreground/70 shrink-0">
                        {log.creatorName}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSpreadsheet
                className="h-4 w-4"
                style={{ color: "var(--muted-foreground)" }}
              />
              Sık İşlem Tipleri
            </CardTitle>
            <p className="text-xs text-muted-foreground">Son 90 gün</p>
          </CardHeader>
          <CardContent>
            {data.topActionTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Yeterli veri yok.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.topActionTypes.map((a) => (
                  <li
                    key={a.nameTr}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span className="truncate">{a.nameTr}</span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {a.count}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
  urgent?: boolean;
}

function StatCard({ label, value, icon, accent, urgent }: StatCardProps) {
  return (
    <Card
      className="relative overflow-hidden transition-all hover:translate-y-[-1px]"
      style={{
        borderColor: accent
          ? `color-mix(in oklch, ${accent} 25%, transparent)`
          : undefined,
        boxShadow: urgent && accent
          ? `0 0 0 1px color-mix(in oklch, ${accent} 30%, transparent), 0 4px 20px -4px color-mix(in oklch, ${accent} 35%, transparent)`
          : undefined,
      }}
    >
      {/* Sol kenarda ince renkli vurgu */}
      {accent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: accent }}
          aria-hidden
        />
      )}
      {/* Sağ üstte radial glow */}
      {accent && (
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, color-mix(in oklch, ${accent} 20%, transparent), transparent 70%)`,
          }}
          aria-hidden
        />
      )}
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between gap-2 text-xs font-medium">
          <span className="text-muted-foreground">{label}</span>
          <div
            className="grid place-items-center h-7 w-7 rounded-lg shrink-0"
            style={{
              background: accent
                ? `color-mix(in oklch, ${accent} 14%, transparent)`
                : "var(--muted)",
              color: accent ?? "var(--muted-foreground)",
            }}
          >
            {icon}
          </div>
        </div>
        <p
          className="text-3xl font-bold mt-2 tabular-nums leading-none"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

interface RecordItem {
  recordNo: string;
  customerName: string | null;
  dueDate: string;
  fabricNameCode: string | null;
}

function RecordList({
  items,
  tone,
}: {
  items: RecordItem[];
  tone: "red" | "amber";
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dotColor =
    tone === "red" ? "var(--destructive)" : "var(--warning)";

  return (
    <ul className="space-y-1">
      {items.map((r) => {
        const due = new Date(r.dueDate);
        const diff = Math.round(
          (due.getTime() - today.getTime()) / 86400_000
        );
        const badge =
          tone === "red"
            ? `${Math.abs(diff)} gün gecikme`
            : diff === 0
              ? "bugün"
              : `${diff} gün`;
        return (
          <li key={r.recordNo}>
            <Link
              href={`/arge?csr=${r.recordNo}`}
              className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  background: dotColor,
                  boxShadow: `0 0 6px ${dotColor}`,
                }}
              />
              <span
                className="font-mono text-xs font-semibold shrink-0 w-16"
                style={{ color: "var(--mod-arge)" }}
              >
                {r.recordNo}
              </span>
              <span className="flex-1 min-w-0 truncate">
                <span className="font-medium">{r.customerName ?? "—"}</span>
                {r.fabricNameCode && (
                  <span className="text-muted-foreground ml-1">
                    · {r.fabricNameCode}
                  </span>
                )}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                {formatTR(r.dueDate)}
              </span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {badge}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface BoyaneItem {
  id: string;
  topNo: string;
  talepTarihi?: string | null;
  gelmeTarihi?: string | null;
  yapilacakIslem: string | null;
  fasonFirma: string | null;
  durum?: string | null;
  gelenMt?: string | null;
  numuneNo: string | null;
}

function BoyaneList({
  items,
  mode,
}: {
  items: BoyaneItem[];
  mode: "overdue" | "returned";
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const dateStr = mode === "overdue" ? item.talepTarihi : item.gelmeTarihi;
        let badge = "";
        if (dateStr) {
          const d = new Date(dateStr);
          const diff = Math.round((today.getTime() - d.getTime()) / 86400_000);
          badge =
            mode === "overdue"
              ? `${diff} gün`
              : diff === 0
                ? "bugün"
                : `${diff} gün önce`;
        }
        const dotColor =
          mode === "overdue"
            ? "var(--destructive)"
            : "var(--success)";
        return (
          <li key={item.id}>
            <Link
              href={`/boyahane/${item.id}`}
              className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{
                  background: dotColor,
                  boxShadow: `0 0 6px ${dotColor}`,
                }}
              />
              <span
                className="font-mono text-xs font-semibold shrink-0 w-24 truncate"
                style={{ color: "var(--mod-boyane)" }}
              >
                {item.topNo}
              </span>
              <span className="flex-1 min-w-0 truncate">
                <span className="font-medium text-xs">
                  {item.yapilacakIslem ?? "—"}
                </span>
                {item.fasonFirma && (
                  <span className="text-[11px] text-muted-foreground ml-1">
                    · {item.fasonFirma}
                  </span>
                )}
              </span>
              {item.numuneNo && (
                <span
                  className="font-mono text-[10px] shrink-0"
                  style={{ color: "var(--mod-numune)" }}
                >
                  {item.numuneNo}
                </span>
              )}
              {dateStr && (
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                  {formatTR(dateStr)}
                </span>
              )}
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {badge}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
