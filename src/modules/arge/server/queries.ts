import "server-only";
import { db } from "@/lib/db/client";
import {
  actionTypes,
  argeTalepleri,
  customers,
  hareketLog,
  users,
} from "@/lib/db/schema";
import { asc, desc, eq, ilike, or, sql, and } from "drizzle-orm";
import type { ListFilterInput } from "../schemas";

/**
 * Liste satırı için zenginleştirilmiş tip (müşteri adı + son işlem tarihi join'li).
 */
export type ArgeListRow = {
  id: string;
  recordNo: string;
  arrivalDate: string;
  dueDate: string;
  completionDate: string | null;
  customerId: string | null;
  customerName: string | null;
  customerCountry: string | null;
  fabricNameCode: string | null;
  variantCount: number | null;
  requestedWidthCm: number | null;
  weightGsm: string | null;
  dyeType: string | null;
  finalStatus: string;
  lastActionDate: string | null;
  lastActionName: string | null;
};

export async function listArgeTalepleri(
  filters: ListFilterInput = {}
): Promise<ArgeListRow[]> {
  const where = [];
  if (filters.search) {
    const q = `%${filters.search}%`;
    where.push(
      or(
        ilike(argeTalepleri.recordNo, q),
        ilike(argeTalepleri.fabricNameCode, q),
        ilike(customers.name, q)
      )
    );
  }
  if (filters.status) where.push(eq(argeTalepleri.finalStatus, filters.status));
  if (filters.customerId)
    where.push(eq(argeTalepleri.customerId, filters.customerId));

  const lastActionSub = sql<string | null>`(
    SELECT MAX(${hareketLog.logDate})
    FROM ${hareketLog}
    WHERE ${hareketLog.recordNo} = ${argeTalepleri.recordNo}
  )`;

  const lastActionNameSub = sql<string | null>`(
    SELECT ${actionTypes.nameTr}
    FROM ${hareketLog}
    LEFT JOIN ${actionTypes} ON ${actionTypes.id} = ${hareketLog.actionTypeId}
    WHERE ${hareketLog.recordNo} = ${argeTalepleri.recordNo}
    ORDER BY ${hareketLog.logDate} DESC, ${hareketLog.createdAt} DESC
    LIMIT 1
  )`;

  const rows = await db
    .select({
      id: argeTalepleri.id,
      recordNo: argeTalepleri.recordNo,
      arrivalDate: argeTalepleri.arrivalDate,
      dueDate: argeTalepleri.dueDate,
      completionDate: argeTalepleri.completionDate,
      customerId: argeTalepleri.customerId,
      customerName: customers.name,
      customerCountry: customers.country,
      fabricNameCode: argeTalepleri.fabricNameCode,
      variantCount: argeTalepleri.variantCount,
      requestedWidthCm: argeTalepleri.requestedWidthCm,
      weightGsm: argeTalepleri.weightGsm,
      dyeType: argeTalepleri.dyeType,
      finalStatus: argeTalepleri.finalStatus,
      lastActionDate: lastActionSub.as("last_action_date"),
      lastActionName: lastActionNameSub.as("last_action_name"),
    })
    .from(argeTalepleri)
    .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(argeTalepleri.arrivalDate), desc(argeTalepleri.recordNo));

  return rows as ArgeListRow[];
}

export async function getArgeTalebi(recordNo: string) {
  const [row] = await db
    .select({
      arge: argeTalepleri,
      customer: customers,
    })
    .from(argeTalepleri)
    .leftJoin(customers, eq(customers.id, argeTalepleri.customerId))
    .where(eq(argeTalepleri.recordNo, recordNo))
    .limit(1);
  return row ?? null;
}

export async function listCustomers() {
  return db.select().from(customers).orderBy(customers.name);
}

// === HAREKET LOG ===

export type HareketLogRow = {
  id: string;
  logDate: string;
  recordNo: string;
  actionTypeId: string | null;
  actionTypeNameTr: string | null;
  description: string | null;
  createdAt: Date;
  creatorName: string | null;
};

export async function listHareketLog(recordNo: string): Promise<HareketLogRow[]> {
  const rows = await db
    .select({
      id: hareketLog.id,
      logDate: hareketLog.logDate,
      recordNo: hareketLog.recordNo,
      actionTypeId: hareketLog.actionTypeId,
      actionTypeNameTr: actionTypes.nameTr,
      description: hareketLog.description,
      createdAt: hareketLog.createdAt,
      creatorName: users.name,
    })
    .from(hareketLog)
    .leftJoin(actionTypes, eq(actionTypes.id, hareketLog.actionTypeId))
    .leftJoin(users, eq(users.id, hareketLog.createdBy))
    .where(eq(hareketLog.recordNo, recordNo))
    .orderBy(desc(hareketLog.logDate), desc(hareketLog.createdAt));

  return rows as HareketLogRow[];
}

// === ACTION TYPES ===

export type ActionTypeOption = { id: string; nameTr: string; codeEn: string };

/** Aktif (isArchived=false) action types — dropdown için */
export async function listActiveActionTypes(): Promise<ActionTypeOption[]> {
  return db
    .select({
      id: actionTypes.id,
      nameTr: actionTypes.nameTr,
      codeEn: actionTypes.codeEn,
    })
    .from(actionTypes)
    .where(eq(actionTypes.isArchived, false))
    .orderBy(asc(actionTypes.sortOrder), asc(actionTypes.nameTr));
}

/** Tümü — yönetim sayfası için */
export async function listAllActionTypes() {
  return db
    .select()
    .from(actionTypes)
    .orderBy(asc(actionTypes.sortOrder), asc(actionTypes.nameTr));
}
