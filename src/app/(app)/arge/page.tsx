import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getArgeTalebi,
  listActiveActionTypes,
  listArgeTalepleri,
  listCustomers,
  listHareketLog,
} from "@/modules/arge/server/queries";
import { listByCsr } from "@/modules/numune-dokuma/server/queries";
import { ArgeTwoPane } from "@/modules/arge/components/ArgeTwoPane";
import { NewArgeDialog } from "@/modules/arge/components/NewArgeDialog";

export const metadata = { title: "Ar-Ge Talepleri — Numune Master" };

interface PageProps {
  searchParams: Promise<{ csr?: string }>;
}

export default async function ArgePage({ searchParams }: PageProps) {
  const { csr } = await searchParams;

  const [rows, customers, actionTypes] = await Promise.all([
    listArgeTalepleri(),
    listCustomers(),
    listActiveActionTypes(),
  ]);

  const customerOptions = customers.map((c) => ({ id: c.id, name: c.name }));

  const detail = csr ? await getArgeTalebi(csr) : null;
  const csrNotFound = Boolean(csr) && detail === null;
  const [logs, relatedNumuneler] = detail
    ? await Promise.all([
        listHareketLog(detail.arge.recordNo),
        listByCsr(detail.arge.recordNo),
      ])
    : [[], []];
  const selected = detail
    ? {
        record: detail.arge,
        customerName: detail.customer?.name ?? null,
        logs,
        relatedNumuneler,
      }
    : null;

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)] p-6 gap-4">
      <PageHeader
        icon={FlaskConical}
        accent="var(--mod-arge)"
        title="Ar-Ge Talepleri"
        count={rows.length}
        description="Satıra tık → sol panelde aç · çift tık → tam sayfa · Esc → kapat"
        actions={<NewArgeDialog customers={customerOptions} />}
      />

      <ArgeTwoPane
        rows={rows}
        customers={customerOptions}
        actionTypes={actionTypes}
        selected={selected}
        notFound={csrNotFound}
      />
    </div>
  );
}
