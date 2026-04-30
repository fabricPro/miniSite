"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DangerDialogHeader } from "@/components/ui/danger-dialog-header";
import { deleteBoyahaneParti } from "../server/actions";

interface Props {
  id: string;
  topNo: string;
}

export function DeletePartiButton({ id, topNo }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBoyahaneParti(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${topNo} silindi`);
      setOpen(false);
      router.push("/boyahane");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          />
        }
      >
        <Trash2 className="h-4 w-4" />
        Sil
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DangerDialogHeader title="Boyahane partisini sil">
          <strong className="font-mono">{topNo}</strong> kalıcı olarak
          silinecek. Bu işlem geri alınamaz.
        </DangerDialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Vazgeç
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Siliniyor..." : "Evet, sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
