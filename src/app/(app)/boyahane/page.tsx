import Link from "next/link";
import { Plus, ExternalLink, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="flex flex-col h-[calc(100vh-2.5rem)] p-6 gap-4">
      <PageHeader
        icon={Palette}
        accent="var(--mod-boyane)"
        title="Boyahane"
        count={rows.length}
        description="Top takibi · seç → tabloyu kopyala → maile yapıştır"
        actions={
          <>
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
          </>
        }
      />

      <BoyahaneListTable
        rows={rows}
        fasonFirmaOptions={fasonFirmaOptions}
        boyaneOptions={boyaneOptions}
      />
    </div>
  );
}
