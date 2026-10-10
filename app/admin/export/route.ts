import { NextResponse } from "next/server";
import { isStaff } from "@/lib/actor";
import { getActor } from "@/lib/auth";
import { audit } from "@/lib/services/audit";
import { exportContactRows } from "@/lib/services/churches";
import { siteUrl } from "@/lib/site";

const COLUMNS = [
  ["name", "Church"],
  ["pastor", "Pastor"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["zip", "ZIP"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
  ["status", "Listing status"],
  ["verification", "Verification"],
  ["verificationDate", "Verification date"],
  ["sourceUrl", "Source checked"],
  ["profileUrl", "Directory page"]
] as const;

function csvCell(value: string) {
  // Neutralise spreadsheet formulas (CSV injection) and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Staff-only contact export. Opens directly in Excel (UTF-8 with BOM). */
export async function GET() {
  const actor = await getActor();
  if (!isStaff(actor)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await exportContactRows(siteUrl());
  const lines = [COLUMNS.map(([, label]) => csvCell(label)).join(","), ...rows.map((row) => COLUMNS.map(([key]) => csvCell(row[key] ?? "")).join(","))];
  await audit(actor, { action: "export.contacts", entityType: "Church", summary: `Exported ${rows.length} church contacts (CSV)` });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="champaign-county-churches-${date}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}
