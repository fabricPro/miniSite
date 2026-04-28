"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  createBoyahaneSchema,
  type CreateBoyahaneInput,
} from "../schemas";
import { BOYAHANE_DURUM, boyahaneDurumLabels } from "../labels";
import {
  createBoyahaneParti,
  updateBoyahaneParti,
} from "../server/actions";

interface NumuneOption {
  id: string;
  numuneNo: string;
  desen: string | null;
}

interface FasonOption {
  name: string;
}

interface BoyaneOption {
  name: string;
}

interface Props {
  numuneOptions: NumuneOption[];
  fasonOptions: FasonOption[];
  boyaneOptions: BoyaneOption[];
  defaultValues?: Partial<CreateBoyahaneInput>;
  // edit modunda id verilir
  partiId?: string;
  initialNumuneNo?: string | null;
}

const DEFAULTS: CreateBoyahaneInput = {
  topNo: "",
  talepTarihi: new Date().toISOString().slice(0, 10),
  termin: undefined,
  numuneAtilimId: undefined,
  dTry: null,
  desenNo: null,
  en: undefined,
  istenenEn: undefined,
  metre: undefined,
  kilo: undefined,
  yapilacakIslem: null,
  fasonFirma: null,
  aciklama: null,
  icerik: null,
  talepEdenKisi: null,
  satirDurumu: "Açık",
  partiNoFk: null,
  durum: "talimat_atildi",
  gittigiBoyane: null,
  gelenMt: undefined,
  gitmeTarihi: undefined,
  gelmeTarihi: undefined,
};

export function BoyahaneForm({
  numuneOptions,
  fasonOptions,
  boyaneOptions,
  defaultValues,
  partiId,
  initialNumuneNo,
}: Props) {
  const router = useRouter();
  const merged = React.useMemo(() => {
    let initial = { ...DEFAULTS, ...defaultValues };
    // initialNumuneNo verildi → otomatik eşleştir
    if (initialNumuneNo && !initial.numuneAtilimId) {
      const found = numuneOptions.find((n) => n.numuneNo === initialNumuneNo);
      if (found) {
        initial = {
          ...initial,
          numuneAtilimId: found.id,
          desenNo: found.desen,
          dTry: found.numuneNo.startsWith("D.TRY")
            ? found.numuneNo.replace(/^D\.TRY/, "")
            : found.numuneNo,
        };
      }
    }
    return initial;
  }, [defaultValues, initialNumuneNo, numuneOptions]);

  const form = useForm<CreateBoyahaneInput, unknown, CreateBoyahaneInput>({
    resolver: zodResolver(createBoyahaneSchema) as never,
    defaultValues: merged,
  });

  const [pending, startTransition] = React.useTransition();
  const [numuneSearch, setNumuneSearch] = React.useState("");

  const filteredNumuneler = React.useMemo(() => {
    const q = numuneSearch.trim().toLocaleLowerCase("tr-TR");
    if (!q) return numuneOptions.slice(0, 50);
    return numuneOptions
      .filter(
        (n) =>
          n.numuneNo.toLocaleLowerCase("tr-TR").includes(q) ||
          (n.desen ?? "").toLocaleLowerCase("tr-TR").includes(q)
      )
      .slice(0, 50);
  }, [numuneSearch, numuneOptions]);

  // Numune seçilince desen + d.try otomatik gelsin
  function handleNumuneSelect(numuneNo: string) {
    const found = numuneOptions.find((n) => n.numuneNo === numuneNo);
    if (found) {
      form.setValue("numuneAtilimId", found.id);
      if (!form.getValues("desenNo")) {
        form.setValue("desenNo", found.desen);
      }
      if (!form.getValues("dTry")) {
        form.setValue(
          "dTry",
          found.numuneNo.startsWith("D.TRY")
            ? found.numuneNo.replace(/^D\.TRY/, "")
            : found.numuneNo
        );
      }
    } else {
      form.setValue("numuneAtilimId", undefined);
    }
  }

  function handleSubmit(values: CreateBoyahaneInput) {
    startTransition(async () => {
      const result = partiId
        ? await updateBoyahaneParti({ ...values, id: partiId })
        : await createBoyahaneParti(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(partiId ? "Parti güncellendi" : "Parti oluşturuldu");
      if (!partiId) {
        router.push(`/boyahane/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-5"
      >
        {/* Üst grid — kimlik */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="topNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top No *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="D000082041"
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
            name="talepTarihi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talep Tarihi</FormLabel>
                <FormControl>
                  <Input
                    type="date"
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
            name="dTry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>D.Try (numune)</FormLabel>
                <FormControl>
                  <Input
                    list="numune-options"
                    placeholder="D.TRY840 veya 840"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      field.onChange(e);
                      const v = e.target.value;
                      setNumuneSearch(v);
                      // Tam eşleşme bulunca otomatik bağla
                      const candidate = v.startsWith("D.TRY")
                        ? v
                        : `D.TRY${v}`;
                      handleNumuneSelect(candidate);
                    }}
                  />
                </FormControl>
                <datalist id="numune-options">
                  {filteredNumuneler.map((n) => (
                    <option key={n.id} value={n.numuneNo}>
                      {n.desen ?? "—"}
                    </option>
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="desenNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desen No</FormLabel>
                <FormControl>
                  <Input
                    placeholder="DTRY840"
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
            name="termin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termin</FormLabel>
                <FormControl>
                  <Input
                    type="date"
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
            name="durum"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durum</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BOYAHANE_DURUM.map((d) => (
                      <SelectItem key={d} value={d}>
                        {boyahaneDurumLabels[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Fiziksel özellikler */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t">
          {(["en", "istenenEn", "metre", "kilo"] as const).map((name) => {
            const labels = {
              en: "En (cm)",
              istenenEn: "İst. En (cm)",
              metre: "Metre",
              kilo: "Kilo",
            } as const;
            return (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{labels[name]}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
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
            );
          })}
          <FormField
            control={form.control}
            name="icerik"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">İçerik</FormLabel>
                <FormControl>
                  <Input
                    placeholder="%100 PES"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* İş emri */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            İş Emri
          </p>
          <FormField
            control={form.control}
            name="yapilacakIslem"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yapılacak İşlem</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="YIKAMA APRE // BOYER"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="fasonFirma"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fason Firma</FormLabel>
                  <FormControl>
                    <Input
                      list="fason-options"
                      placeholder="MORAL TEKSTİL"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <datalist id="fason-options">
                    {fasonOptions.map((f) => (
                      <option key={f.name} value={f.name} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="talepEdenKisi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talep Eden Kişi</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DEGRAPE / Furkan / ..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="aciklama"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Açıklama</FormLabel>
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
        </div>

        {/* ERP Alanları (collapsible) */}
        <Collapsible defaultOpen={!!partiId}>
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 -mx-3 text-left hover:bg-muted/50 transition-colors border-t pt-4"
              />
            }
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              ERP Alanları (manuel — sonra SQL&apos;den gelecek)
            </span>
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[panel-open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="partiNoFk"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Parti No (F.K)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gittigiBoyane"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Gittiği Boyane</FormLabel>
                    <FormControl>
                      <Input
                        list="boyane-options"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <datalist id="boyane-options">
                      {boyaneOptions.map((b) => (
                        <option key={b.name} value={b.name} />
                      ))}
                    </datalist>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gelenMt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Gelen MT</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value)
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
                name="gitmeTarihi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Gitme Tarihi</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="gelmeTarihi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Gelme Tarihi</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="satirDurumu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Satır Durumu</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v ? v : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Açık">Açık</SelectItem>
                        <SelectItem value="Kapalı">Kapalı</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsiblePanel>
        </Collapsible>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Kaydediliyor..." : partiId ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
