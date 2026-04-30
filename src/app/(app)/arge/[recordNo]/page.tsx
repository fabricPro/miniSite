import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutPanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getArgeTalebi,
  listActiveActionTypes,
  listCustomers,
  listHareketLog,
} from "@/modules/arge/server/queries";
import { listByCsr } from "@/modules/numune-dokuma/server/queries";
import { ArgeDetailPanel } from "@/modules/arge/components/ArgeDetailPanel";

interface Props {
  params: Promise<{ recordNo: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { recordNo } = await params;
  return { title: `${recordNo} — Numune Master` };
}

export default async function ArgeDetailPage({ params }: Props) {
  const { recordNo } = await params;
  const [record, customers, actionTypes] = await Promise.all([
    getArgeTalebi(recordNo),
    listCustomers(),
    listActiveActionTypes(),
  ]);
  if (!record) notFound();

  const [logs, relatedNumuneler] = await Promise.all([
    listHareketLog(record.arge.recordNo),
    listByCsr(record.arge.recordNo),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)] p-6 gap-4 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/arge" />}>
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/arge?csr=${record.arge.recordNo}`} />}
        >
          <LayoutPanelLeft className="h-4 w-4" />
          Two-pane görünüme geç
        </Button>
      </div>

      <div className="flex-1 min-h-0 rounded-md border bg-card overflow-hidden">
        <ArgeDetailPanel
          record={record.arge}
          customerName={record.customer?.name ?? null}
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          logs={logs}
          actionTypes={actionTypes}
          relatedNumuneler={relatedNumuneler}
        />
      </div>
    </div>
  );
}
