export type Network = "MTN" | "Telecel" | "AirtelTigo";

/** Ghana mobile prefixes → network (NCA / common reseller mapping). */
const PREFIX_MAP: Record<string, Network> = {
  // MTN
  "024": "MTN",
  "025": "MTN",
  "053": "MTN",
  "054": "MTN",
  "055": "MTN",
  "059": "MTN",
  // Telecel (formerly Vodafone)
  "020": "Telecel",
  "050": "Telecel",
  // AirtelTigo
  "026": "AirtelTigo",
  "027": "AirtelTigo",
  "056": "AirtelTigo",
  "057": "AirtelTigo",
};

/** Normalize to local 0XXXXXXXXX form when possible. */
export function normalizeGhanaPhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, "").trim();
  if (!s) return null;

  if (s.startsWith("+233")) s = `0${s.slice(4)}`;
  else if (s.startsWith("233") && s.length >= 12) s = `0${s.slice(3)}`;

  if (/^0\d{9}$/.test(s)) return s;
  return null;
}

export function detectNetwork(phone: string): Network | null {
  const normalized = normalizeGhanaPhone(phone);
  if (!normalized) return null;
  return PREFIX_MAP[normalized.slice(0, 3)] ?? null;
}

/**
 * Split pasted / uploaded text into candidate phone tokens.
 * Accepts commas, newlines, semicolons, and whitespace-separated values.
 */
export function parsePhoneList(text: string): string[] {
  const parts = text
    .split(/[\n\r,;]+/)
    .flatMap((chunk) => chunk.trim().split(/\s+/))
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const phone = normalizeGhanaPhone(part);
    if (!phone || seen.has(phone)) continue;
    seen.add(phone);
    out.push(phone);
  }
  return out;
}

export type ParsedBulkRow = {
  phone: string;
  network: Network | null;
  error?: string;
};

export function buildBulkRows(phones: string[]): ParsedBulkRow[] {
  return phones.map((phone) => {
    const network = detectNetwork(phone);
    if (!network) {
      return { phone, network: null, error: "Unknown network prefix" };
    }
    return { phone, network };
  });
}

/** Extract phone-like cells from a spreadsheet / CSV blob as text. */
export async function phonesFromSpreadsheetFile(file: File): Promise<string[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt") || name.endsWith(".tsv")) {
    const text = await file.text();
    return parsePhoneList(text);
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as (string | number)[][];

    const tokens: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        const value = String(cell ?? "").trim();
        if (value) tokens.push(value);
      }
    }
    return parsePhoneList(tokens.join("\n"));
  }

  throw new Error("Use a .csv, .txt, or Excel (.xlsx) file with phone numbers only.");
}
