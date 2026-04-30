import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutPanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNumuneByNo } from "@/modules/numune-dokuma/server/queries";
import { listArgeTalepleri } from "@/modules/arge/server/queries";
import {
  listByNumune as listBoyaneByNumune,
  listDistinctFasonFirma,
} from "@/modules/boyahane/server/queries";
import { NumuneDetailPanel } from "@/modules/numune-dokuma/components/NumuneDetailPanel";

interface Props {
  params: Promise<{ numuneNo: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { numuneNo } = await params;
  return { title: `${decodeURIComponent(numuneNo)} — Numune Master` };
}

export default async function NumuneDetayPage({ params }: Props) {
  const { numuneNo: encoded } = await params;
  const numuneNo = decodeURIComponent(encoded);

  const detail = await getNumuneByNo(numuneNo);
  if (!detail) notFound();

  const argeRows = await listArgeTalepleri();
  const csrOptions = argeRows.map((r) => ({
    recordNo: r.recordNo,
    customerName: r.customerName,
  }));
  const [boyahanePartileri, fasonOptions] = await Promise.all([
    listBoyaneByNumune(detail.numune.id),
    listDistinctFasonFirma(),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)] p-6 gap-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/numune-dokuma" />}
        >
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              href={`/numune-dokuma?n=${encodeURIComponent(numuneNo)}`}
            />
          }
        >
          <LayoutPanelLeft className="h-4 w-4" />
          Two-pane görünüme geç
        </Button>
      </div>

      <div className="flex-1 min-h-0 rounded-md border bg-card overflow-hidden">
        <NumuneDetailPanel
          numune={detail.numune}
          customerName={detail.customerName}
          varyantlar={detail.varyantlar}
          csrOptions={csrOptions}
          boyahanePartileri={boyahanePartileri}
          fasonOptions={fasonOptions}
        />
      </div>
    </div>
  );
}
