import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { numuneAtilim } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import {
  listDistinctFasonFirma,
  listDistinctGittigiBoyane,
} from "@/modules/boyahane/server/queries";
import { BoyahaneForm } from "@/modules/boyahane/components/BoyahaneForm";

export const metadata = { title: "Yeni Boyahane Partisi — Numune Master" };

interface PageProps {
  searchParams: Promise<{ numune?: string }>;
}

export default async function YeniBoyaneParti({ searchParams }: PageProps) {
  const { numune } = await searchParams;

  const [numuneRows, fasonFirmaList, boyaneList] = await Promise.all([
    db
      .select({
        id: numuneAtilim.id,
        numuneNo: numuneAtilim.numuneNo,
        desen: numuneAtilim.desen,
      })
      .from(numuneAtilim)
      .orderBy(desc(numuneAtilim.date)),
    listDistinctFasonFirma(),
    listDistinctGittigiBoyane(),
  ]);

  return (
    <div className="flex flex-col p-6 gap-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/boyahane" />}>
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
      </div>
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Yeni Boyahane Partisi
        </h2>
        <p className="text-sm text-muted-foreground">
          KK barkodunu (Top No) gir; D.Try yazınca numune otomatik bağlanır.
        </p>
      </header>

      <div className="rounded-md border bg-card p-5">
        <BoyahaneForm
          numuneOptions={numuneRows}
          fasonOptions={fasonFirmaList.map((name) => ({ name }))}
          boyaneOptions={boyaneList.map((name) => ({ name }))}
          initialNumuneNo={numune}
        />
      </div>
    </div>
  );
}
