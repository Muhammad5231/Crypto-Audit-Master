const Papa = require("papaparse");
const Decimal = require("decimal.js");

const aliases = {
  time: [
    "Time",
    "Timestamp",
    "Date",
    "Created At",
    "Executed At",
    "Executed time",
    "Trade Time",
    "Order Time",
  ],
  pair: ["Contract", "Symbol", "Pair", "Market", "Asset"],
  qty: ["Qty", "Quantity", "Filled Qty", "Amount", "Size"],
  side: ["Side", "Type", "Order Side"],
  price: ["Exec.Price", "Price", "Executed Price", "Avg Price"],
  fee: ["Fees", "Fees paid", "Commission", "Fee", "Trading Fees"],
  tds: ["TDS", "Tax Deducted", "Tax Deducted at Source"],
  tax: [
    "Tax",
    "Crypto Tax",
    "Direct Tax",
    "Total Tax",
    "Total Direct Tax",
    "Income Tax",
    "Tax Amount",
    "Base Crypto Tax",
  ],
  status: ["Status", "Order Status"],
  orderValue: ["Order Value", "Value", "Total"],
};

function pick(row, keys) {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (x) => x.trim().toLowerCase() === k.toLowerCase()
    );

    if (
      found &&
      row[found] !== undefined &&
      row[found] !== null &&
      String(row[found]).trim() !== ""
    ) {
      return row[found];
    }
  }

  return "";
}

function dec(value) {
  try {
    const clean = String(value ?? "")
      .replace(/[,₹$]/g, "")
      .trim();

    if (!clean || clean === "-" || clean.toLowerCase() === "na" || clean.toLowerCase() === "n/a") {
      return "0";
    }

    return new Decimal(clean).toString();
  } catch {
    return "0";
  }
}

function parseFlexibleDate(value) {
  if (!value) return null;

  let raw = String(value).trim();

  if (!raw) return null;

  raw = raw.replace(/^"|"$/g, "").trim();

  const deltaMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?:\.(\d+))?([+-]\d{2}:\d{2})/
  );

  if (deltaMatch) {
    const datePart = deltaMatch[1];
    const timePart = deltaMatch[2];
    const msPart = deltaMatch[3]
      ? deltaMatch[3].slice(0, 3).padEnd(3, "0")
      : "000";
    const offsetPart = deltaMatch[4];

    const iso = `${datePart}T${timePart}.${msPart}${offsetPart}`;
    const d = new Date(iso);

    return Number.isNaN(d.getTime()) ? null : d;
  }

  raw = raw.replace(/\s+(IST|UTC|GMT)\s+.+$/i, "");
  raw = raw.replace(/\s+Asia\/Kolkata$/i, "");

  if (/^\d{10}$/.test(raw)) {
    const d = new Date(Number(raw) * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{13}$/.test(raw)) {
    const d = new Date(Number(raw));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const nativeDate = new Date(raw);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  let match = raw.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    let year = Number(match[3]);

    if (year < 100) year += 2000;

    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const d = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  match = raw.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);

    const hour = Number(match[4] || 0);
    const minute = Number(match[5] || 0);
    const second = Number(match[6] || 0);

    const d = new Date(year, month, day, hour, minute, second);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function parseCsv(buffer, exchangeName = "Unknown") {
  const text = buffer.toString("utf8");

  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const warnings = [];
  const trades = [];

  let skippedCount = 0;
  let filteredByStatus = 0;

  parsed.data.forEach((row, idx) => {
    const rowNumber = idx + 2;

    const status = String(pick(row, aliases.status) || "executed").toLowerCase();

    if (/cancel|reject|fail|pending/.test(status)) {
      filteredByStatus++;
      return;
    }

    const sideRaw = String(pick(row, aliases.side)).toUpperCase();

    const side =
      sideRaw.includes("SELL") || sideRaw === "S"
        ? "SELL"
        : sideRaw.includes("BUY") || sideRaw === "B"
        ? "BUY"
        : "";

    const pair = String(pick(row, aliases.pair)).trim().toUpperCase();

    const quantity = dec(pick(row, aliases.qty));
    const price = dec(pick(row, aliases.price));

    const timeValue = pick(row, aliases.time);
    const executedAt = parseFlexibleDate(timeValue);

    if (!side || !pair || new Decimal(quantity).lte(0) || new Decimal(price).lte(0)) {
      skippedCount++;
      warnings.push(`Row ${rowNumber}: missing/invalid side, pair, qty, or price`);
      return;
    }

    if (!executedAt) {
      skippedCount++;
      warnings.push(`Row ${rowNumber}: invalid date/time "${timeValue}". Row skipped.`);
      return;
    }

    trades.push({
      exchangeName,
      pair,
      side,
      quantity,
      price,
      fee: dec(pick(row, aliases.fee)),
      tds: dec(pick(row, aliases.tds)),
      tax: dec(pick(row, aliases.tax)),
      status,
      orderValue: dec(pick(row, aliases.orderValue)),
      executedAt,
      raw: row,
    });
  });

  return {
    trades,
    skippedCount,
    filteredByStatus,
    warnings,
    metaWarnings: parsed.errors.map((e) => e.message),
  };
}

module.exports = { parseCsv };