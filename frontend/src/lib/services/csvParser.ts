import Papa from 'papaparse';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedTrade {
  pair: string;
  side: string;
  quantity: string;
  price: string;
  orderValue: string;
  fees: string;
  executedAt: string;
  tds?: string; // Optional: actual TDS from exchange (e.g., CoinDCX)
}

export interface CsvParseResult {
  trades: ParsedTrade[];
  skipped: number;
  warnings: string[];
  detectedExchange: string;
  filteredByStatus: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Order statuses that indicate the order was NOT executed — skip these rows */
const SKIP_STATUSES = new Set([
  'cancelled', 'canceled', 'rejected', 'expired', 'open',
  'partial', 'partially_filled', 'partiallyfilled',
]);

// ─── Column Alias Definitions (with priority) ──────────────────────────────
// When multiple CSV columns map to the same internal field, the one with the
// highest priority wins. This ensures correct behaviour across exchanges:
//   - Delta:     Exec.Price (10) > Order Price (5) > Price (3)
//   - CoinDCX:   Avg Price (8) > Price Per Unit (5)
//   - CoinDCX:   Updated At (7) > Created At (3)

interface ColumnAlias {
  field: string; // keyof ParsedTrade | '_status'
  priority: number;
}

const COLUMN_ALIASES: Record<string, ColumnAlias> = {
  // ── executedAt ─────────────────────────────────────────────────────────
  time:               { field: 'executedAt', priority: 6 },
  timestamp:          { field: 'executedAt', priority: 6 },
  date:               { field: 'executedAt', priority: 4 },
  datetime:           { field: 'executedAt', priority: 4 },
  'date/time':        { field: 'executedAt', priority: 4 },
  'date_time':        { field: 'executedAt', priority: 4 },
  'executed at':      { field: 'executedAt', priority: 6 },
  'trade time':       { field: 'executedAt', priority: 6 },
  'created at':       { field: 'executedAt', priority: 3 }, // CoinDCX: prefer Updated At
  'updated at':       { field: 'executedAt', priority: 7 }, // CoinDCX: execution timestamp

  // ── pair ───────────────────────────────────────────────────────────────
  contract:           { field: 'pair', priority: 8 },  // Delta
  pair:               { field: 'pair', priority: 10 }, // CoinDCX (e.g., "I-ETH_INR")
  symbol:             { field: 'pair', priority: 6 },
  market:             { field: 'pair', priority: 3 },  // CoinDCX Market (e.g., "ETHINR")
  'trading pair':     { field: 'pair', priority: 6 },
  'market/pair':      { field: 'pair', priority: 6 },
  instrument:         { field: 'pair', priority: 6 },

  // ── quantity ───────────────────────────────────────────────────────────
  'total quantity':   { field: 'quantity', priority: 9 }, // CoinDCX
  'filled qty':       { field: 'quantity', priority: 10 },
  qty:                { field: 'quantity', priority: 8 }, // Delta
  quantity:           { field: 'quantity', priority: 7 },
  amount:             { field: 'quantity', priority: 3 },
  size:               { field: 'quantity', priority: 3 },
  'trade amount':     { field: 'quantity', priority: 3 },
  volume:             { field: 'quantity', priority: 3 },

  // ── side ───────────────────────────────────────────────────────────────
  side:               { field: 'side', priority: 10 },
  type:               { field: 'side', priority: 5 },
  direction:          { field: 'side', priority: 5 },
  'order side':       { field: 'side', priority: 5 },
  action:             { field: 'side', priority: 5 },

  // ── price (priority ensures correct column wins) ───────────────────────
  'exec.price':       { field: 'price', priority: 10 }, // Delta
  'exec price':       { field: 'price', priority: 10 },
  'avg price':        { field: 'price', priority: 8 },  // CoinDCX filled avg
  'average price':    { field: 'price', priority: 8 },
  'fill price':       { field: 'price', priority: 7 },
  'trade price':      { field: 'price', priority: 7 },
  price:              { field: 'price', priority: 6 },
  'price per unit':   { field: 'price', priority: 5 },  // CoinDCX limit price fallback
  'order price':      { field: 'price', priority: 4 },

  // ── orderValue ─────────────────────────────────────────────────────────
  'order value':           { field: 'orderValue', priority: 10 },
  'order value (inr)':     { field: 'orderValue', priority: 10 },
  'filled value':          { field: 'orderValue', priority: 8 },
  total:                   { field: 'orderValue', priority: 5 },
  'total value':           { field: 'orderValue', priority: 5 },
  'trade value':           { field: 'orderValue', priority: 5 },
  cashflow:                { field: 'orderValue', priority: 4 }, // Delta
  value:                   { field: 'orderValue', priority: 3 },

  // ── fees ───────────────────────────────────────────────────────────────
  'trading fees':     { field: 'fees', priority: 10 }, // Delta
  'fee amount':       { field: 'fees', priority: 10 }, // CoinDCX
  fees:               { field: 'fees', priority: 8 },
  'fees paid':        { field: 'fees', priority: 8 },
  fee:                { field: 'fees', priority: 8 },
  commission:         { field: 'fees', priority: 5 },
  'transaction fee':  { field: 'fees', priority: 5 },
  'fee (inr)':        { field: 'fees', priority: 5 },
  'fees (inr)':       { field: 'fees', priority: 5 },

  // ── tds (optional, e.g., CoinDCX) ─────────────────────────────────────
  'total tds inr':    { field: 'tds', priority: 10 },

  // ── status (internal, used for row filtering) ─────────────────────────
  status:             { field: '_status', priority: 10 },
};

// ─── Exchange Format Detection ───────────────────────────────────────────

/**
 * Auto-detect the exchange format from CSV headers.
 * Uses header fingerprinting — no data inspection needed.
 */
function detectExchangeFormat(headers: string[]): string {
  const h = headers.map(h => h.trim().toLowerCase());

  // Delta Exchange: "Contract", "Exec.Price", "Filled/Remaining", "Trading Fees"
  if (
    h.some(x => x === 'contract') &&
    h.some(x => x.includes('exec.price') || x.includes('exec price')) &&
    h.some(x => x.includes('filled'))
  ) {
    return 'Delta';
  }

  // CoinDCX: "Pair" (with I- prefix), "Total Quantity", "Fee Amount", "Total Tds INR"
  if (
    h.includes('total quantity') &&
    (h.includes('fee amount') || h.includes('total tds inr'))
  ) {
    return 'CoinDCX';
  }

  // WazirX: "Market", "Fee", "Total"
  if (
    h.includes('market') &&
    h.includes('fee') &&
    h.includes('total')
  ) {
    return 'WazirX';
  }

  // Binance: "Symbol", "QuoteAsset" (trade history format)
  if (
    h.some(x => x.includes('symbol')) &&
    h.some(x => x.includes('quoteasset'))
  ) {
    return 'Binance';
  }

  // Generic fallback
  return 'Unknown';
}

// ─── Helper Functions ─────────────────────────────────────────────────────

/**
 * Normalize a pair string by stripping exchange-specific prefixes.
 *
 * Examples:
 *   "I-ETH_INR"  → "ETH_INR"   (CoinDCX spot)
 *   "F-BTC_INR"  → "BTC_INR"   (CoinDCX futures)
 *   "ETH_INR"    → "ETH_INR"   (Delta, already clean)
 *   "BTCUSDT"    → "BTCUSDT"   (Binance, no prefix)
 */
function normalizePair(raw: string): string {
  const upper = raw.toUpperCase().trim();
  // Strip prefix if the portion after the first dash contains an underscore
  // (indicating a BASE_QUOTE format like ETH_INR)
  const dashIdx = upper.indexOf('-');
  if (dashIdx > 0 && dashIdx < upper.length - 1) {
    const afterDash = upper.slice(dashIdx + 1);
    if (afterDash.includes('_')) {
      return afterDash;
    }
  }
  return upper;
}

/**
 * Clean a date string by removing non-standard timezone suffixes.
 *
 * Handles:
 *   "2026-05-08 00:48:35.412884+05:30 IST Asia/Kolkata" → "+05:30" kept
 *   "2026-05-06 12:46:19 UTC"                           → "Z" appended
 *   "2026-05-08 00:48:35 IST"                            → "+05:30" appended
 *   "2024-01-15T10:30:00Z"                               → unchanged
 */
function cleanDateString(dateStr: string): string {
  let cleaned = dateStr.trim();

  // Pattern 1: offset followed by timezone name(s), e.g. "+05:30 IST Asia/Kolkata"
  cleaned = cleaned.replace(/([+-]\d{2}:\d{2})\s+[A-Za-z].*$/, '$1');

  // Pattern 2: standalone "UTC" suffix — replace with Z
  cleaned = cleaned.replace(/\s+UTC$/i, 'Z');

  // Pattern 3: standalone "IST" suffix — append India offset
  cleaned = cleaned.replace(/\s+IST$/i, '+05:30');

  return cleaned.trim();
}

/**
 * Parse a date string flexibly. Supports:
 * - ISO 8601 strings (e.g., 2024-01-15T10:30:00Z)
 * - Unix timestamps in milliseconds (e.g., 1705312200000)
 * - Common date formats with timezone suffixes (Delta IST, CoinDCX UTC)
 */
function parseDateFlexibly(dateStr: string): string {
  const trimmed = dateStr.trim();

  // Clean non-standard timezone suffixes first
  const cleaned = cleanDateString(trimmed);

  // Try as a number (unix timestamp in ms)
  const numValue = Number(cleaned);
  if (!isNaN(numValue) && cleaned.length > 0) {
    const date = new Date(numValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try native Date parsing (handles ISO 8601 and many common formats)
  const nativeDate = new Date(cleaned);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate.toISOString();
  }

  return trimmed; // Return as-is if we can't parse it
}

/**
 * Clean a numeric string value (remove commas, whitespace, currency symbols).
 */
function cleanNumericValue(val: string): string {
  if (!val || val.trim() === '') return '0';
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  return cleaned || '0';
}

// ─── Column Mapping Builder ──────────────────────────────────────────────

/**
 * Build a mapping from CSV column index to our internal field name.
 * When multiple columns map to the same field, the one with the highest priority wins.
 * Returns: { fieldMapping, statusColIndex }
 */
function buildColumnMapping(
  headers: string[],
): {
  fieldMapping: Map<number, keyof ParsedTrade>;
  statusColIndex: number | null;
} {
  // Collect all candidates per field
  const candidates: Map<string, Array<{ colIndex: number; priority: number }>> = new Map();

  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i].trim().toLowerCase();
    const alias = COLUMN_ALIASES[normalized];
    if (!alias) continue;

    const existing = candidates.get(alias.field) || [];
    existing.push({ colIndex: i, priority: alias.priority });
    candidates.set(alias.field, existing);
  }

  // For each field, keep only the column with highest priority
  const fieldMapping = new Map<number, keyof ParsedTrade>();
  let statusColIndex: number | null = null;

  for (const [field, cols] of candidates) {
    // Sort by priority descending, pick highest
    cols.sort((a, b) => b.priority - a.priority);
    const winner = cols[0];

    if (field === '_status') {
      statusColIndex = winner.colIndex;
    } else {
      fieldMapping.set(winner.colIndex, field as keyof ParsedTrade);
    }
  }

  return { fieldMapping, statusColIndex };
}

// ─── Main Parser ─────────────────────────────────────────────────────────

/**
 * Parse CSV content into structured trade data.
 *
 * Supports multiple Indian crypto exchange formats:
 * - **Delta Exchange**: TransactionLog / OrderHistory CSVs
 * - **CoinDCX**: Order History CSVs
 * - **Generic**: Any CSV with standard column names (Binance, WazirX, etc.)
 *
 * Features:
 * - Auto-detects exchange format from column headers
 * - Filters out cancelled/rejected/open orders via Status column
 * - Normalizes pair names (strips CoinDCX "I-" prefix, etc.)
 * - Parses dates with IST/UTC suffixes
 * - Priority-based column aliasing for multi-exchange support
 *
 * @param csvText  - Raw CSV text content
 * @param filename - Original filename (used for warnings)
 * @returns Parsed trades, skip counts, warnings, detected exchange
 */
export function parseCsvContent(csvText: string, filename: string): CsvParseResult {
  const trades: ParsedTrade[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  let filteredByStatus = 0;

  // ── Parse CSV ────────────────────────────────────────────────────────
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(
      e => e.type === 'Quotes' || e.type === 'FieldMismatch',
    );
    for (const err of criticalErrors.slice(0, 5)) {
      warnings.push(`CSV parse error at row ${err.row}: ${err.message}`);
    }
  }

  const headers = parseResult.meta.fields || [];
  if (headers.length === 0) {
    warnings.push(`No headers found in file "${filename}". The file may be empty or malformed.`);
    return { trades, skipped: 0, warnings, detectedExchange: 'Unknown', filteredByStatus: 0 };
  }

  // ── Detect exchange format ──────────────────────────────────────────
  const detectedExchange = detectExchangeFormat(headers);

  // ── Build column mapping ────────────────────────────────────────────
  const { fieldMapping, statusColIndex } = buildColumnMapping(headers);

  // ── Check for required fields ───────────────────────────────────────
  const mappedFields = new Set(fieldMapping.values());
  const requiredFields: (keyof ParsedTrade)[] = ['pair', 'side', 'quantity', 'price', 'executedAt'];
  const missingFields = requiredFields.filter(f => !mappedFields.has(f));

  if (missingFields.length > 0) {
    warnings.push(
      `Missing required column mappings in "${filename}": ${missingFields.join(', ')}. ` +
      `Please ensure your CSV has columns like: Contract/Symbol/Pair (pair), Side, Qty/Quantity, Price, Time/Timestamp.`,
    );
  }

  // ── Process each row ────────────────────────────────────────────────
  for (let rowIndex = 0; rowIndex < parseResult.data.length; rowIndex++) {
    const row = parseResult.data[rowIndex] as Record<string, string>;

    // Check status column first (skip non-executed orders)
    if (statusColIndex !== null) {
      const statusHeader = headers[statusColIndex];
      const statusValue = (row[statusHeader] || '').toString().trim().toLowerCase();
      if (statusValue && SKIP_STATUSES.has(statusValue)) {
        filteredByStatus++;
        continue;
      }
    }

    // Build trade object from mapped columns
    const trade: Partial<ParsedTrade> = {};
    for (const [colIndex, fieldName] of fieldMapping) {
      const header = headers[colIndex];
      const rawValue = (row[header] || '').toString().trim();
      if (rawValue === '') continue;

      if (fieldName === 'executedAt') {
        trade[fieldName] = parseDateFlexibly(rawValue);
      } else if (fieldName === 'side') {
        trade[fieldName] = rawValue.toUpperCase();
      } else if (fieldName === 'pair') {
        trade[fieldName] = normalizePair(rawValue);
      } else if (
        fieldName === 'quantity' ||
        fieldName === 'price' ||
        fieldName === 'orderValue' ||
        fieldName === 'fees' ||
        fieldName === 'tds'
      ) {
        trade[fieldName] = cleanNumericValue(rawValue);
      } else {
        trade[fieldName] = rawValue;
      }
    }

    // Validate required fields
    const hasAllRequired = requiredFields.every(f => trade[f] && trade[f]!.trim() !== '');
    if (!hasAllRequired) {
      skipped++;
      continue;
    }

    // Validate side — only BUY or SELL
    const side = trade.side!.toUpperCase();
    if (side !== 'BUY' && side !== 'SELL') {
      skipped++;
      continue;
    }

    // Validate price is not zero (would indicate unexecuted order)
    const priceVal = parseFloat(trade.price || '0');
    if (priceVal === 0) {
      skipped++;
      continue;
    }

    // Validate the date was parsed correctly
    const executedAt = trade.executedAt!;
    const parsedDate = new Date(executedAt);
    if (isNaN(parsedDate.getTime())) {
      warnings.push(`Row ${rowIndex + 2}: Could not parse date "${executedAt}"`);
      skipped++;
      continue;
    }

    trades.push({
      pair: trade.pair!,
      side,
      quantity: trade.quantity || '0',
      price: trade.price || '0',
      orderValue: trade.orderValue || '0',
      fees: trade.fees || '0',
      executedAt: parsedDate.toISOString(),
      tds: trade.tds || undefined,
    });
  }

  // ── Post-parse warnings ─────────────────────────────────────────────
  if (parseResult.data.length > 0 && trades.length === 0 && skipped === 0) {
    warnings.push(`No valid trade rows found in "${filename}".`);
  }

  if (skipped > 0 && warnings.length === 0) {
    warnings.push(
      `${skipped} row(s) were skipped due to missing fields, zero price, or invalid side values.`,
    );
  }

  if (filteredByStatus > 0) {
    warnings.push(
      `${filteredByStatus} order(s) were filtered out (cancelled/rejected/open status).`,
    );
  }

  if (detectedExchange !== 'Unknown') {
    warnings.push(`Detected exchange format: ${detectedExchange}.`);
  }

  return { trades, skipped, warnings, detectedExchange, filteredByStatus };
}
