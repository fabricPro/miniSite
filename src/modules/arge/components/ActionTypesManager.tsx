"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  createActionTypeSchema,
  updateActionTypeSchema,
  type CreateActionTypeInput,
  type UpdateActionTypeInput,
} from "../schemas";
import {
  createActionType,
  deleteActionType,
  toggleActionTypeArchive,
  updateActionType,
} from "../server/actions";

interface ActionTypeRow {
  id: string;
  nameTr: string;
  codeEn: string;
  sortOrder: number;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: Date;
}

interface Props {
  items: ActionTypeRow[];
}

export function ActionTypesManager({ items }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const active = items.filter((i) => !i.isArchived);
  const archived = items.filter((i) => i.isArchived);

  async function handleToggleArchive(row: ActionTypeRow) {
    setPendingId(row.id);
    try {
      const result = await toggleActionTypeArchive(row.id, !row.isArchived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(row.isArchived ? "Arşivden çıkarıldı" : "Arşivlendi");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(row: ActionTypeRow) {
    setPendingId(row.id);
    try {
      const result = await deleteActionType(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Silindi");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            İşlem Tipleri
          </h2>
          <p className="text-sm text-muted-foreground">
            Hareket logunda kullanılan işlem tipleri. Sistem kayıtları
            silinemez — arşivlemeyi dene.
          </p>
        </div>
        <CreateActionTypeDialog />
      </div>

      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Aktif ({active.length})
        </h3>
        {active.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aktif işlem tipi yok.
          </div>
        ) : (
          <ActionTypeTable
            rows={active}
            pendingId={pendingId}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDelete}
          />
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Arşivlenmiş ({archived.length})
          </h3>
          <ActionTypeTable
            rows={archived}
            pendingId={pendingId}
            onToggleArchive={handleToggleArchive}
            onDelete={handleDelete}
          />
        </section>
      )}
    </div>
  );
}

function ActionTypeTable({
  rows,
  pendingId,
  onToggleArchive,
  onDelete,
}: {
  rows: ActionTypeRow[];
  pendingId: string | null;
  onToggleArchive: (row: ActionTypeRow) => void;
  onDelete: (row: ActionTypeRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Ad (TR)</th>
            <th className="text-left px-3 py-2 font-medium">Kod (EN)</th>
            <th className="text-right px-3 py-2 font-medium w-20">Sıra</th>
            <th className="text-left px-3 py-2 font-medium w-28">Etiket</th>
            <th className="text-right px-3 py-2 font-medium w-40">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="px-3 py-2">{row.nameTr}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {row.codeEn}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.sortOrder}
              </td>
              <td className="px-3 py-2">
                {row.isSystem && <Badge variant="outline">sistem</Badge>}
                {row.isArchived && (
                  <Badge variant="secondary" className="ml-1">
                    arşiv
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                  <EditActionTypeDialog row={row} />
                  <Button
                    variant="ghost"
                    size="sm"
                    title={row.isArchived ? "Arşivden çıkar" : "Arşivle"}
                    onClick={() => onToggleArchive(row)}
                    disabled={pendingId === row.id}
                  >
                    {row.isArchived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                  <DeleteActionTypeDialog
                    row={row}
                    pending={pendingId === row.id}
                    onConfirm={() => onDelete(row)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateActionTypeDialog() {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const form = useForm<
    CreateActionTypeInput,
    unknown,
    CreateActionTypeInput
  >({
    resolver: zodResolver(createActionTypeSchema) as never,
    defaultValues: {
      nameTr: "",
      codeEn: "",
      sortOrder: 0,
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createActionType(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Eklendi");
      setOpen(false);
      form.reset({ nameTr: "", codeEn: "", sortOrder: 0 });
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        Yeni işlem tipi
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni işlem tipi</DialogTitle>
          <DialogDescription>
            Hareket logunda seçim listesine eklenir.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="nameTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad (TR) *</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn. BOYAHANE GÖNDERİLDİ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codeEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod (EN) *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="sent_to_dyehouse"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sıra</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditActionTypeDialog({ row }: { row: ActionTypeRow }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const form = useForm<
    UpdateActionTypeInput,
    unknown,
    UpdateActionTypeInput
  >({
    resolver: zodResolver(updateActionTypeSchema) as never,
    defaultValues: {
      id: row.id,
      nameTr: row.nameTr,
      codeEn: row.codeEn,
      sortOrder: row.sortOrder,
      isArchived: row.isArchived,
    },
  });

  // Prop değişirse formu senkronla
  React.useEffect(() => {
    if (open) {
      form.reset({
        id: row.id,
        nameTr: row.nameTr,
        codeEn: row.codeEn,
        sortOrder: row.sortOrder,
        isArchived: row.isArchived,
      });
    }
  }, [open, row, form]);

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateActionType(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Güncellendi");
      setOpen(false);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" title="Düzenle" />
        }
      >
        <Pencil className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>İşlem tipini düzenle</DialogTitle>
          {row.isSystem && (
            <DialogDescription>
              Bu bir sistem kaydı — silinemez ama güncellenebilir.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="nameTr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ad (TR) *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codeEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kod (EN) *</FormLabel>
                  <FormControl>
                    <Input className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sıra</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(e.target.valueAsNumber || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteActionTypeDialog({
  row,
  pending,
  onConfirm,
}: {
  row: ActionTypeRow;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Sil"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={row.isSystem}
          />
        }
      >
        <Trash2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>İşlem tipini sil</DialogTitle>
          <DialogDescription>
            <strong>{row.nameTr}</strong> kalıcı olarak silinecek. Log
            kayıtlarında kullanılıyorsa işlem iptal edilir — bunun yerine
            arşivlemeyi dene.
          </DialogDescription>
        </DialogHeader>
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
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={pending}
          >
            {pending ? "Siliniyor..." : "Evet, sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
