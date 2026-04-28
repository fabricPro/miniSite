"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArgeForm } from "./ArgeForm";
import { createArgeTalebi } from "../server/actions";
import type { CreateArgeInput } from "../schemas";

interface Props {
  customers: Array<{ id: string; name: string }>;
}

export function NewArgeDialog({ customers }: Props) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  async function handleSubmit(values: CreateArgeInput) {
    const result = await createArgeTalebi(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.recordNo} oluşturuldu`);
    setOpen(false);
    // Yeni kayıt ?csr= ile two-pane'de açılsın
    router.push(`/arge?csr=${result.data.recordNo}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Yeni Ar-Ge
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Ar-Ge Talebi</DialogTitle>
        </DialogHeader>
        <ArgeForm customers={customers} onSubmit={handleSubmit} submitLabel="Oluştur" />
      </DialogContent>
    </Dialog>
  );
}
