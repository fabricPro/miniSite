import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listBoyahanePartileri,
  listDistinctFasonFirma,
  listDistinctGittigiBoyane,
} from "@/modules/boyahane/server/queries";
import { BoyahaneListTable } from "@/modules/boyahane/components/BoyahaneListTable";

export const metadata = { title: "Boyahane — Numune Master" };

export default async function BoyahanePage() {
  const [rows, fasonFirmaOptions, boyaneOptions] = await Promise.all([
    listBoyahanePartileri(),
    listDistinctFasonFirma(),
    listDistinctGittigiBoyane(),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-1px)] p-6 gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Boyahane</h2>
          <p className="text-sm text-muted-foreground">
            Top takibi · seç → tabloyu kopyala → maile yapıştır
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            render={<Link href="/boyahane/kopyala" target="_blank" />}
          >
            <ExternalLink className="h-4 w-4" />
            Kopya Sayfası
          </Button>
          <Button render={<Link href="/boyahane/yeni" />}>
            <Plus className="h-4 w-4" />
            Yeni Parti
          </Button>
        </div>
      </header>

      <BoyahaneListTable
        rows={rows}
        fasonFirmaOptions={fasonFirmaOptions}
        boyaneOptions={boyaneOptions}
      />
    </div>
  );
}
