import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "İplik — Numune Master" };

export default function Page() {
  return (
    <div className="p-6 space-y-4">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">İplik Sipariş &amp; Takip</h2>
        <p className="text-sm text-muted-foreground">Sprint 7&apos;de eklenecek</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>İplikSipariş + İplik Takip Raporu karşılığı</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          ERP bağlantısı kurulduktan sonra iplik stok verisiyle birleşecek.
        </CardContent>
      </Card>
    </div>
  );
}
