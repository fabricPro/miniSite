"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NumuneForm } from "./NumuneForm";
import { createNumune } from "../server/actions";
import type { CreateNumuneInput } from "../schemas";

interface CsrOption {
  recordNo: string;
  customerName: string | null;
}

interface Props {
  csrOptions: CsrOption[];
  initialCsr: string | null;
}

export function NewNumuneForm({ csrOptions, initialCsr }: Props) {
  const router = useRouter();

  async function handleSubmit(values: CreateNumuneInput) {
    const result = await createNumune(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.numuneNo} oluşturuldu`);
    router.push(`/numune-dokuma/${result.data.numuneNo}`);
    router.refresh();
  }

  return (
    <NumuneForm
      csrOptions={csrOptions}
      defaultValues={{ recordNo: initialCsr ?? null }}
      onSubmit={handleSubmit}
      submitLabel="Numune Oluştur"
    />
  );
}
