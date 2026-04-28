import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAllActionTypes } from "@/modules/arge/server/queries";
import { ActionTypesManager } from "@/modules/arge/components/ActionTypesManager";

export const metadata = { title: "İşlem Tipleri — Numune Master" };

export default async function IslemTipleriPage() {
  const items = await listAllActionTypes();

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/ayarlar" />}>
        <ArrowLeft className="h-4 w-4" />
        Ayarlar
      </Button>
      <ActionTypesManager items={items} />
    </div>
  );
}
