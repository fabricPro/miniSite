import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db/client";
import { actionTypes, customers } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Ayarlar — Numune Master" };

async function getData() {
  try {
    const [customerList, actionList] = await Promise.all([
      db.select().from(customers),
      db.select().from(actionTypes),
    ]);
    return { customerList, actionList };
  } catch {
    return { customerList: [], actionList: [] };
  }
}

export default async function AyarlarPage() {
  const { customerList, actionList } = await getData();

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Ayarlar</h2>
        <p className="text-sm text-muted-foreground">
          Lookup tabloları — müşteriler ve işlem tipleri
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Müşteriler ({customerList.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customerList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz müşteri yok. Seed script çalıştır: <code className="text-xs">npm run db:seed</code>
              </p>
            ) : (
              customerList.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  {c.isInternal && <Badge variant="secondary">İç proje</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>İşlem Tipleri ({actionList.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/ayarlar/islem-tipleri" />}
            >
              <ExternalLink className="h-4 w-4" />
              Yönet
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz işlem tipi yok. Seed script çalıştır.
              </p>
            ) : (
              actionList
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>{a.nameTr}</span>
                    {a.isSystem && <Badge variant="outline">sistem</Badge>}
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
