import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  title: string;
  children: React.ReactNode;
}

/**
 * Standartlaştırılmış destructive (silme) dialog header'ı —
 * sol üstte yumuşak kırmızı daire içinde uyarı ikonu + sağ tarafta başlık + açıklama.
 */
export function DangerDialogHeader({ title, children }: Props) {
  return (
    <DialogHeader>
      <div className="flex items-start gap-3">
        <div
          className="grid place-items-center h-9 w-9 rounded-full shrink-0 mt-0.5"
          style={{
            background:
              "color-mix(in oklch, var(--destructive) 14%, transparent)",
          }}
        >
          <AlertTriangle
            className="h-4 w-4"
            style={{ color: "var(--destructive)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </div>
      </div>
    </DialogHeader>
  );
}
