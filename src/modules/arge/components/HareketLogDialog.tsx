"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { createHareketLogSchema, type CreateHareketLogInput } from "../schemas";
import { appendHareketLog } from "../server/actions";
import type { ActionTypeOption } from "../server/queries";

interface Props {
  recordNo: string;
  actionTypes: ActionTypeOption[];
}

export function HareketLogDialog({ recordNo, actionTypes }: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const form = useForm<CreateHareketLogInput, unknown, CreateHareketLogInput>({
    resolver: zodResolver(createHareketLogSchema) as never,
    defaultValues: {
      recordNo,
      logDate: new Date().toISOString().slice(0, 10),
      actionTypeName: null,
      description: null,
    },
  });

  // recordNo değişirse formu güncelle
  React.useEffect(() => {
    form.setValue("recordNo", recordNo);
  }, [recordNo, form]);

  // Dialog açılınca: tarih bugünü al + cursor işlem tipi alanına git
  React.useEffect(() => {
    if (!open) return;
    form.setValue("logDate", new Date().toISOString().slice(0, 10));
    const t = setTimeout(() => {
      form.setFocus("actionTypeName");
    }, 30);
    return () => clearTimeout(t);
  }, [open, form]);

  function focusActionType() {
    setTimeout(() => form.setFocus("actionTypeName"), 30);
  }

  /** Submit — başarılıysa açıklama+işlem tipini temizle, dialog'u açık tut. */
  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await appendHareketLog(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Log eklendi");
      // Dialog'u kapatmıyoruz — aynı tarihte birden fazla log eklenebilsin
      form.reset({
        recordNo,
        logDate: values.logDate, // tarih korunur
        actionTypeName: null,
        description: null,
      });
      router.refresh();
      focusActionType();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="h-4 w-4" />
        Log ekle
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hareket logu ekle — {recordNo}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="logDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarih *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actionTypeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>İşlem Tipi</FormLabel>
                  <FormControl>
                    <Input
                      list="action-type-options"
                      placeholder="Serbest metin yaz veya listeden seç"
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ""}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                  </FormControl>
                  <datalist id="action-type-options">
                    {actionTypes.map((a) => (
                      <option key={a.id} value={a.nameTr} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Açıklama
                    <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                      Enter: kaydet · Shift+Enter: alt satır
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Serbest metin (ops.)"
                      {...field}
                      value={field.value ?? ""}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                        // Shift+Enter → default davranış (yeni satır)
                      }}
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
                Kapat
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Ekleniyor..." : "Ekle (Enter)"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
