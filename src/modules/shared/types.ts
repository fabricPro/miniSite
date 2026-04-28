/**
 * Modüller arası ortak tipler.
 * Bir modül diğerini import etmemeli — buradan paylaşım yapılır.
 */

export type RecordNo = string;

export type FinalStatus = "open" | "closed" | "cancelled";

export type DyeType = "yarn_dye" | "piece_dye";

export type BinaryStatus = "done" | "not_done";
export type LabWorkStatus = "done" | "not_done" | "in_progress";
export type YarnStatus =
  | "given"
  | "not_given"
  | "in_stock"
  | "not_needed"
  | "to_be_produced";
export type WarpStatus = "done" | "not_done" | "instructed" | "on_loom";

export type StatusColor = "green" | "yellow" | "red" | "gray";
