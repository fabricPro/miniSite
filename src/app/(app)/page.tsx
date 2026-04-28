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
} from "lucide-react";
import { db } from "@/lib/db/client";
import {
  actionTypes,
  argeTalepleri,
  customers,
  hareketLog,
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
    };
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pano</h2>
          <p className="text-sm text-muted-foreground">
            R&D departmanı genel özet · {formatTRLong(new Date())}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<a href="/api/export/excel" />}>
          <Download className="h-4 w-4" />
          Excel&apos;e aktar
        </Button>
      </header>

      {/* Özet kartları */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Açık Ar-Ge"
          value={data.open}
          icon={<FolderOpen className="h-4 w-4" />}
        />
        <StatCard
          label="Geciken"
          value={data.overdue}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={data.overdue > 0 ? "red" : "default"}
        />
        <StatCard
          label="Bu hafta termin"
          value={data.thisWeek}
          icon={<CalendarClock className="h-4 w-4" />}
          tone={data.thisWeek > 0 ? "amber" : "default"}
        />
        <StatCard
          label="Tamamlanan"
          value={data.closed}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Geciken + Bu hafta termin */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
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
              <CalendarClock className="h-4 w-4 text-amber-600" />
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

      {/* Son hareketler + sık işlem tipleri */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
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
                          className="font-mono text-xs text-indigo-600 hover:underline shrink-0"
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
              <FileSpreadsheet className="h-4 w-4 text-slate-600" />
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
  tone?: "default" | "red" | "amber";
}

function StatCard({ label, value, icon, tone = "default" }: StatCardProps) {
  const valueClass =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : "";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span>{label}</span>
          {icon}
        </div>
        <p className={`text-3xl font-bold mt-1 tabular-nums ${valueClass}`}>
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
  const dotClass = tone === "red" ? "bg-red-600" : "bg-amber-500";

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
              <span className={`h-2 w-2 rounded-full shrink-0 ${dotClass}`} />
              <span className="font-mono text-xs text-muted-foreground shrink-0 w-16">
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
