import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listArgeTalepleri } from "@/modules/arge/server/queries";
import { NewNumuneForm } from "@/modules/numune-dokuma/components/NewNumuneForm";

export const metadata = { title: "Yeni Numune — Numune Master" };

interface PageProps {
  searchParams: Promise<{ csr?: string }>;
}

export default async function YeniNumunePage({ searchParams }: PageProps) {
  const { csr } = await searchParams;

  const argeRows = await listArgeTalepleri();
  const csrOptions = argeRows.map((r) => ({
    recordNo: r.recordNo,
    customerName: r.customerName,
  }));

  return (
    <div className="flex flex-col p-6 gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/numune-dokuma" />}
        >
          <ArrowLeft className="h-4 w-4" />
          Liste
        </Button>
      </div>
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Yeni Numune</h2>
        <p className="text-sm text-muted-foreground">
          Numune kodu otomatik üretilir (D.TRY___). İlk varyant V01 otomatik
          eklenir, sonra varyantları ekleyip düzenleyebilirsin.
        </p>
      </header>

      <div className="rounded-md border bg-card p-5">
        <NewNumuneForm csrOptions={csrOptions} initialCsr={csr ?? null} />
      </div>
    </div>
  );
}
