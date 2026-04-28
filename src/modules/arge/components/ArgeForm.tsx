"use client";

import * as React from "react";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createArgeSchema, type CreateArgeInput } from "../schemas";
import {
  finalStatusLabels,
  dyeTypeLabels,
  binaryStatusLabels,
  labWorkStatusLabels,
  yarnStatusLabels,
  warpStatusLabels,
  toOptions,
} from "../labels";

type CustomerOption = { id: string; name: string };

interface Props {
  customers: CustomerOption[];
  defaultValues?: Partial<CreateArgeInput>;
  onSubmit: (values: CreateArgeInput) => Promise<void>;
  submitLabel?: string;
}

const NONE = "__none";

const DEFAULTS: CreateArgeInput = {
  arrivalDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
  customerId: undefined,
  finalStatus: "open",
  completionDate: undefined,
  fabricNameCode: null,
  variantCount: undefined,
  requestedWidthCm: undefined,
  weightGsm: undefined,
  weaveType: null,
  dyeType: undefined,
  analysisStatus: undefined,
  labWorkStatus: undefined,
  priceStatus: null,
  yarnStatus: undefined,
  warpStatus: undefined,
  finishingProcess: null,
  note: null,
};

export function ArgeForm({
  customers,
  defaultValues,
  onSubmit,
  submitLabel = "Kaydet",
}: Props) {
  const form = useForm<CreateArgeInput, unknown, CreateArgeInput>({
    resolver: zodResolver(createArgeSchema) as never,
    defaultValues: { ...DEFAULTS, ...defaultValues },
  });

  const [pending, startTransition] = React.useTransition();

  // base-ui Select: items prop'u verilince SelectValue otomatik label basar.
  // "__none" sentinel'i için "—" label'ı da dahil.
  const customerItems = React.useMemo(
    () => [
      { value: NONE, label: "—" },
      ...customers.map((c) => ({ value: c.id, label: c.name })),
    ],
    [customers]
  );
  const finalStatusItems = React.useMemo(
    () => toOptions(finalStatusLabels),
    []
  );

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Kayıt başarısız");
      }
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* KİMLİK */}
        <Section title="Kimlik">
          <Grid>
            <FormField
              control={form.control}
              name="arrivalDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geliş Tarihi *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Termin Tarihi *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="completionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamamlanma Tarihi</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Müşteri</FormLabel>
                  <Select
                    items={customerItems}
                    value={field.value ?? NONE}
                    onValueChange={(v) =>
                      field.onChange(v === NONE ? undefined : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seç..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customerItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="finalStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durum</FormLabel>
                  <Select
                    items={finalStatusItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {finalStatusItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Grid>
        </Section>

        {/* KUMAŞ ÖZELLİKLERİ */}
        <Section title="Kumaş Özellikleri">
          <Grid>
            <FormField
              control={form.control}
              name="fabricNameCode"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Kumaş Adı / Kod</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <NumberField name="variantCount" label="Varyant Sayısı" />
            <NumberField name="requestedWidthCm" label="İstenen En (cm)" />
            <NumberField name="weightGsm" label="Gramaj (g/m²)" step="0.01" />
            <FormField
              control={form.control}
              name="weaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Örgü Tipi</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <EnumSelect
              name="dyeType"
              label="Boya Tipi"
              options={toOptions(dyeTypeLabels)}
            />
          </Grid>
        </Section>

        {/* SÜREÇ DURUMLARI */}
        <Section title="Süreç Durumları">
          <Grid>
            <EnumSelect
              name="analysisStatus"
              label="Analiz"
              options={toOptions(binaryStatusLabels)}
            />
            <EnumSelect
              name="labWorkStatus"
              label="Lab Çalışması"
              options={toOptions(labWorkStatusLabels)}
            />
            <EnumSelect
              name="yarnStatus"
              label="İplik"
              options={toOptions(yarnStatusLabels)}
            />
            <EnumSelect
              name="warpStatus"
              label="Çözgü"
              options={toOptions(warpStatusLabels)}
            />
            <FormField
              control={form.control}
              name="priceStatus"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Fiyat Durumu</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="örn. Verildi / Bekleniyor"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Grid>
        </Section>

        {/* BİTİŞ & NOT */}
        <Section title="Bitiş & Not">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="finishingProcess"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bitiş İşlemi</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Not</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  );
}

function NumberField({
  name,
  label,
  step,
}: {
  name: "variantCount" | "requestedWidthCm" | "weightGsm";
  label: string;
  step?: string;
}) {
  const { control } = useFormContext<CreateArgeInput>();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step ?? "1"}
              value={field.value === undefined || field.value === null ? "" : String(field.value)}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? undefined : e.target.value)
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function EnumSelect<
  N extends "dyeType" | "analysisStatus" | "labWorkStatus" | "yarnStatus" | "warpStatus"
>({
  name,
  label,
  options,
}: {
  name: N;
  label: string;
  options: Array<{ value: string; label: string }>;
}) {
  const { control } = useFormContext<CreateArgeInput>();
  const items = React.useMemo(
    () => [{ value: NONE, label: "—" }, ...options],
    [options]
  );
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select
            items={items}
            value={(field.value as string | undefined) ?? NONE}
            onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seç..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
