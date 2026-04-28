import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth/config";
import { getNumuneByNo } from "@/modules/numune-dokuma/server/queries";
import { NumuneFormPDF } from "@/modules/numune-dokuma/pdf/NumuneFormPDF";

// react-pdf SSR — static optimization devre dışı
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ numuneNo: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { numuneNo: encoded } = await ctx.params;
  const numuneNo = decodeURIComponent(encoded);

  const detail = await getNumuneByNo(numuneNo);
  if (!detail) {
    return NextResponse.json(
      { error: "Numune bulunamadı" },
      { status: 404 }
    );
  }

  const buffer = await renderToBuffer(
    <NumuneFormPDF
      numune={detail.numune}
      customerName={detail.customerName}
      varyantlar={detail.varyantlar}
    />
  );

  // Browser inline açsın (yeni sekmede); kullanıcı isterse "Save As"
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${numuneNo}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
