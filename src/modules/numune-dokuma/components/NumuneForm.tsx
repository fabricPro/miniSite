"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { createNumuneSchema, type CreateNumuneInput } from "../schemas";
import { NUMUNE_DURUM, numuneDurumLabels } from "../labels";

interface CsrOption {
  recordNo: string;
  customerName: string | null;
}

interface Props {
  csrOptions: CsrOption[];
  defaultValues?: Partial<CreateNumuneInput>;
  onSubmit: (values: CreateNumuneInput) => Promise<void>;
  submitLabel?: string;
}

const ATKI_KEYS = [
  "atki1",
  "atki2",
  "atki3",
  "atki4",
  "atki5",
  "atki6",
  "atki7",
  "atki8",
] as const;
type AtkiKey = (typeof ATKI_KEYS)[number];

const IRO_KEYS = [
  "iro1",
  "iro2",
  "iro3",
  "iro4",
  "iro5",
  "iro6",
  "iro7",
  "iro8",
] as const;
type IroKey = (typeof IRO_KEYS)[number];

const IRO_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const DEFAULTS: CreateNumuneInput = {
  recordNo: null,
  date: new Date().toISOString().slice(0, 10),
  tezgah: null,
  desen: null,
  siklik: null,
  rapor: null,
  cozguAdi: null,
  atki1: "",
  atki2: null,
  atki3: null,
  atki4: null,
  atki5: null,
  atki6: null,
  atki7: null,
  atki8: null,
  // Default iro = slot indeksi (atki_1 → iro 1, atki_2 → iro 2, vs.)
  iro1: 1,
  iro2: null,
  iro3: null,
  iro4: null,
  iro5: null,
  iro6: null,
  iro7: null,
  iro8: null,
  aciklama: null,
  kg: undefined,
  hamEn: undefined,
  mamulEn: undefined,
  durum: "acik",
  completionDate: undefined,
};

/** Default'larda kaç atki dolu? Aktif atki sayısını oradan başlat. */
function activeAtkiCountFrom(values: Partial<CreateNumuneInput>): number {
  let count = 1;
  for (let i = ATKI_KEYS.length - 1; i >= 0; i--) {
    const v = values[ATKI_KEYS[i]];
    if (v != null && String(v).trim() !== "") {
      count = i + 1;
      break;
    }
  }
  return Math.max(1, Math.min(count, ATKI_KEYS.length));
}

export function NumuneForm({
  csrOptions,
  defaultValues,
  onSubmit,
  submitLabel = "Kaydet",
}: Props) {
  const merged = { ...DEFAULTS, ...defaultValues };
  const form = useForm<CreateNumuneInput, unknown, CreateNumuneInput>({
    resolver: zodResolver(createNumuneSchema) as never,
    defaultValues: merged,
  });

  const [pending, startTransition] = React.useTransition();
  const [activeAtkiCount, setActiveAtkiCount] = React.useState(() =>
    activeAtkiCountFrom(merged)
  );
  const [csrSearch, setCsrSearch] = React.useState("");

  const filteredCsrs = React.useMemo(() => {
    const q = csrSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return csrOptions.slice(0, 50);
    return csrOptions
      .filter(
        (c) =>
          c.recordNo.toLocaleLowerCase("tr-TR").includes(q) ||
          (c.customerName ?? "").toLocaleLowerCase("tr-TR").includes(q)
      )
      .slice(0, 50);
  }, [csrSearch, csrOptions]);

  function handleSubmit(values: CreateNumuneInput) {
    // Aktif olmayan atki slotlarını ve iro alanlarını null'a çek
    for (let i = activeAtkiCount; i < ATKI_KEYS.length; i++) {
      (values as Record<string, unknown>)[ATKI_KEYS[i]] = null;
      (values as Record<string, unknown>)[IRO_KEYS[i]] = null;
    }
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        console.error("NumuneForm submit", err);
        toast.error("Kaydederken hata oluştu");
      }
    });
  }

  const canAddMore = activeAtkiCount < ATKI_KEYS.length;
  const canRemove = activeAtkiCount > 1;

  /** Form'daki tüm iro değerlerini izle — duplicate detection için */
  const watchedIros = useWatch({
    control: form.control,
    name: IRO_KEYS as unknown as IroKey[],
  }) as Array<number | null | undefined>;

  /** Hangi iro numaraları birden fazla satırda kullanılıyor */
  const duplicateIros = React.useMemo(() => {
    const counts = new Map<number, number>();
    watchedIros.slice(0, activeAtkiCount).forEach((v) => {
      if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, n]) => n > 1)
        .map(([k]) => k)
    );
  }, [watchedIros, activeAtkiCount]);

  function addAtki() {
    if (!canAddMore) return;
    const newIdx = activeAtkiCount; // 0-based index of new slot
    // Yeni iro = kullanılmayan en küçük 1-8 numarası, yoksa slot indeksi+1
    const used = new Set(
      watchedIros.slice(0, activeAtkiCount).filter((v) => v != null) as number[]
    );
    let nextIro = newIdx + 1;
    for (const n of IRO_OPTIONS) {
      if (!used.has(n)) {
        nextIro = n;
        break;
      }
    }
    form.setValue(IRO_KEYS[newIdx], nextIro as never, {
      shouldValidate: false,
    });
    setActiveAtkiCount((c) => c + 1);
  }

  function removeAtki() {
    if (!canRemove) return;
    // Son slot'un atki + iro değerlerini temizle
    const lastIdx = activeAtkiCount - 1;
    form.setValue(ATKI_KEYS[lastIdx], null as never, { shouldValidate: false });
    form.setValue(IRO_KEYS[lastIdx], null as never, { shouldValidate: false });
    setActiveAtkiCount((c) => c - 1);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        {/* Durum — formun en üstünde, prominent */}
        <FormField
          control={form.control}
          name="durum"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center">
              <FormLabel className="sm:w-24 sm:shrink-0 text-sm font-medium">
                Durum
              </FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NUMUNE_DURUM.map((d) => (
                    <SelectItem key={d} value={d}>
                      {numuneDurumLabels[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Üst grid — temel kimlik */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="date"
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
            name="tezgah"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tezgah</FormLabel>
                <FormControl>
                  <Input
                    placeholder="T08"
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
            name="desen"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desen / Örgü</FormLabel>
                <FormControl>
                  <Input
                    placeholder="DTRY839 / BEZ / ARMÜR..."
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
            name="siklik"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sıklık</FormLabel>
                <FormControl>
                  <Input
                    placeholder="10,5 A/CM"
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
            name="rapor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rapor</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1-1 RAPORLU"
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
            name="recordNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CSR No (opsiyonel)</FormLabel>
                <FormControl>
                  <div className="space-y-1">
                    <Input
                      list="csr-options"
                      placeholder="CSR024 — boş bırakılabilir"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        field.onChange(e);
                        setCsrSearch(e.target.value);
                      }}
                    />
                    <datalist id="csr-options">
                      {filteredCsrs.map((c) => (
                        <option key={c.recordNo} value={c.recordNo}>
                          {c.customerName ?? "—"}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Çözgü ipi — full width */}
        <FormField
          control={form.control}
          name="cozguAdi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Çözgü İpi / Adı</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="70 Denye Ham Y.Mat Çözgü - 9,5 Sıklık - 3120 Tel / SİYAH"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Atkı 1-N (dinamik) — her satırda İro + Atkı yan yana */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Atkı İplikleri ({activeAtkiCount} / {ATKI_KEYS.length})
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Her atkı için tezgahtaki fiziksel iro numarasını seç (1-8)
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={removeAtki}
                disabled={!canRemove}
              >
                <X className="h-3 w-3" />
                Kaldır
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={addAtki}
                disabled={!canAddMore}
              >
                <Plus className="h-3 w-3" />
                Atkı Ekle
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {ATKI_KEYS.slice(0, activeAtkiCount).map((atkiName, i) => {
              const iroName = IRO_KEYS[i];
              const iroValue = watchedIros[i];
              const isDuplicate =
                iroValue != null && duplicateIros.has(iroValue);
              return (
                <div
                  key={atkiName}
                  className={cn(
                    "flex items-end gap-2 rounded-md border p-2 transition-colors",
                    isDuplicate
                      ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20"
                      : "border-transparent"
                  )}
                >
                  <FormField
                    control={form.control}
                    name={iroName}
                    render={({ field }) => (
                      <FormItem className="w-24 shrink-0">
                        <FormLabel className="text-xs">İro</FormLabel>
                        <Select
                          value={field.value != null ? String(field.value) : ""}
                          onValueChange={(v) =>
                            field.onChange(v ? Number(v) : null)
                          }
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {IRO_OPTIONS.map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                İro {n}
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
                    name={atkiName}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">
                          Atkı {i + 1}
                          {i === 0 && (
                            <span className="ml-1 text-destructive">*</span>
                          )}
                          {isDuplicate && (
                            <span
                              className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] font-normal"
                              title={`İro ${iroValue} birden fazla atkıda kullanılıyor`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Çakışma
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              i === 0
                                ? "4,6 NM POLY PARLAK MOLİNA (K-4365)"
                                : i === 1
                                ? "300/96 DENYE HAM PARLAK PES(FDY)"
                                : "—"
                            }
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Üretim/KK çıktıları — KG, Ham En, Mamül En
            (Top No artık boyahane modülünde — bir numune'den çıkan her top
            ayrı parti olarak Boyahane sekmesinde takip ediliyor) */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Üretim / Kalite Kontrol
          </p>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">KG</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="—"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hamEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Ham En (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mamulEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Mamül En (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Açıklama */}
        <FormField
          control={form.control}
          name="aciklama"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Notlar, özel talimatlar..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
