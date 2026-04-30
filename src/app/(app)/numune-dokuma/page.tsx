import Link from "next/link";
import { Plus, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  getNumuneByNo,
  listDistinctTezgah,
  listNumune,
} from "@/modules/numune-dokuma/server/queries";
import { listArgeTalepleri } from "@/modules/arge/server/queries";
import {
  listByNumune as listBoyaneByNumune,
  listDistinctFasonFirma,
} from "@/modules/boyahane/server/queries";
import { NumuneTwoPane } from "@/modules/numune-dokuma/components/NumuneTwoPane";

export const metadata = { title: "Numune Dokuma — Numune Master" };

interface PageProps {
  searchParams: Promise<{ n?: string }>;
}

export default async function NumuneDokumaPage({ searchParams }: PageProps) {
  const { n } = await searchParams;

  const [rows, tezgahOptions, argeRows, fasonOptions] = await Promise.all([
    listNumune(),
    listDistinctTezgah(),
    listArgeTalepleri(),
    listDistinctFasonFirma(),
  ]);

  const csrOptions = argeRows.map((r) => ({
    recordNo: r.recordNo,
    customerName: r.customerName,
  }));

  const detail = n ? await getNumuneByNo(n) : null;
  const notFound = Boolean(n) && detail === null;
  const boyahanePartileri = detail
    ? await listBoyaneByNumune(detail.numune.id)
    : [];
  const selected = detail
    ? {
        numune: detail.numune,
        customerName: detail.customerName,
        varyantlar: detail.varyantlar,
        boyahanePartileri,
      }
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)] p-6 gap-4">
      <PageHeader
        icon={Scissors}
        accent="var(--mod-numune)"
        title="Numune Dokuma"
        count={rows.length}
        description="Satıra tık → sol panelde aç · çift tık → tam sayfa · Esc → kapat"
        actions={
          <Button render={<Link href="/numune-dokuma/yeni" />}>
            <Plus className="h-4 w-4" />
            Yeni Numune
          </Button>
        }
      />

      <NumuneTwoPane
        rows={rows}
        tezgahOptions={tezgahOptions}
        csrOptions={csrOptions}
        fasonOptions={fasonOptions}
        selected={selected}
        notFound={notFound}
      />
    </div>
  );
}
