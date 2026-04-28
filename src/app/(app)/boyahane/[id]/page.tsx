import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/client";
import { numuneAtilim } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import {
  getBoyahanePartiById,
  listDistinctFasonFirma,
  listDistinctGittigiBoyane,
} from "@/modules/boyahane/server/queries";
import { BoyahaneForm } from "@/modules/boyahane/components/BoyahaneForm";
import { BoyahaneDurumBadge } from "@/modules/boyahane/components/BoyahaneDurumBadge";
import { DeletePartiButton } from "@/modules/boyahane/components/DeletePartiButton";
import type { CreateBoyahaneInput } from "@/modules/boyahane/schemas";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const detail = await getBoyahanePartiById(id);
  return {
    title: detail
      ? `${detail.parti.topNo} — Boyahane`
      : "Boyahane Parti — Numune Master",
  };
}

export default async function BoyahanePartiDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getBoyahanePartiById(id);
  if (!detail) notFound();

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

  const p = detail.parti;
  const defaults: Partial<CreateBoyahaneInput> = {
    topNo: p.topNo,
    talepTarihi: p.talepTarihi ?? undefined,
    termin: p.termin ?? undefined,
    numuneAtilimId: p.numuneAtilimId ?? undefined,
    dTry: p.dTry,
    desenNo: p.desenNo,
    en: p.en ?? undefined,
    istenenEn: p.istenenEn ?? undefined,
    metre: p.metre != null ? Number(p.metre) : undefined,
    kilo: p.kilo != null ? Number(p.kilo) : undefined,
    yapilacakIslem: p.yapilacakIslem,
    fasonFirma: p.fasonFirma,
    aciklama: p.aciklama,
    icerik: p.icerik,
    talepEdenKisi: p.talepEdenKisi,
    satirDurumu: p.satirDurumu,
    partiNoFk: p.partiNoFk,
    durum:
      (p.durum as CreateBoyahaneInput["durum"]) ?? "talimat_atildi",
    gittigiBoyane: p.gittigiBoyane,
    gelenMt: p.gelenMt != null ? Number(p.gelenMt) : undefined,
    gitmeTarihi: p.gitmeTarihi ?? undefined,
    gelmeTarihi: p.gelmeTarihi ?? undefined,
  };

  return (
    <div className="flex flex-col p-6 gap-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/boyahane" />}>
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
        <DeletePartiButton id={p.id} topNo={p.topNo} />
      </div>
      <header>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight font-mono">
            {p.topNo}
          </h2>
          <BoyahaneDurumBadge durum={p.durum} />
          {detail.numuneNo && (
            <Link
              href={`/numune-dokuma/${detail.numuneNo}`}
              className="text-sm text-indigo-600 hover:underline"
            >
              ↳ {detail.numuneNo}
            </Link>
          )}
        </div>
        {p.fasonFirma && (
          <p className="text-sm text-muted-foreground mt-1">
            {p.fasonFirma}
            {p.gittigiBoyane && ` → ${p.gittigiBoyane}`}
          </p>
        )}
      </header>

      <div className="rounded-md border bg-card p-5">
        <BoyahaneForm
          numuneOptions={numuneRows}
          fasonOptions={fasonFirmaList.map((name) => ({ name }))}
          boyaneOptions={boyaneList.map((name) => ({ name }))}
          defaultValues={defaults}
          partiId={p.id}
        />
      </div>
    </div>
  );
}
