import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Çözgü — Numune Master" };

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Çözgü Takibi</h2>
        <p className="text-sm text-muted-foreground">Sprint 9&apos;da eklenecek</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>ÇÖZGÜ TALEBİ karşılığı</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CSR koduna bağlı çözgü talep kayıtları.
        </CardContent>
      </Card>
    </div>
  );
}
