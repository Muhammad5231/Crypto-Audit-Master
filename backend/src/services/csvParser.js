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

  totalQty: ["Total Quantity", "Order Quantity", "Qty"],

  remainingQty: ["Remaining Quantity", "Remaining Qty", "Pending Quantity"],

  side: ["Side", "Type", "Order Side"],

  price: ["Exec.Price", "Price", "Executed Price", "Avg Price"],

  avgPrice: ["Avg Price", "Average Price"],

  pricePerUnit: ["Price Per Unit", "Limit Price", "Price"],

  fee: ["Fees", "Fees paid", "Commission", "Fee", "Trading Fees", "Fee Amount"],

  tds: ["TDS", "Tax Deducted", "Tax Deducted at Source", "Total Tds INR"],

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

    if (
      !clean ||
      clean === "-" ||
      clean.toLowerCase() === "na" ||
      clean.toLowerCase() === "n/a" ||
      clean.toLowerCase() === "null" ||
      clean.toLowerCase() === "undefined"
    ) {
      return "0";
    }

    return new Decimal(clean).toString();
  } catch {
    return "0";
  }
}

function D(value) {
  try {
    return new Decimal(value || 0);
  } catch {
    return new Decimal(0);
  }
}

function normalizePair(value) {
  let pair = String(value || "").trim().toUpperCase();

  // Example: I-BTC_INR => BTC_INR
  pair = pair.replace(/^I-/, "");

  // Example: BTCINR => BTC_INR
  if (!pair.includes("_") && pair.endsWith("INR")) {
    pair = pair.replace(/INR$/, "_INR");
  }

  return pair;
}

function parseFlexibleDate(value) {
  if (!value) return null;

  let raw = String(value).trim();

  if (!raw) return null;

  raw = raw.replace(/^"|"$/g, "").trim();

  // Example: 2026-05-14 17:22:29 UTC
  const utcMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+UTC$/i
  );

  if (utcMatch) {
    const d = new Date(`${utcMatch[1]}T${utcMatch[2]}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Delta format:
  // 2026-05-08 00:48:35.412884+05:30 IST Asia/Kolkata
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

  return null;
}

function getQuantity(row) {
  const normalQty = dec(pick(row, aliases.qty));

  if (D(normalQty).gt(0)) {
    return normalQty;
  }

  const totalQty = dec(pick(row, aliases.totalQty));
  const remainingQty = dec(pick(row, aliases.remainingQty));

  // For order-history CSV:
  // executed quantity = Total Quantity - Remaining Quantity
  if (D(totalQty).gt(0)) {
    const filledQty = D(totalQty).minus(remainingQty);

    if (filledQty.gt(0)) {
      return filledQty.toString();
    }
  }

  return "0";
}

function getPrice(row) {
  const avgPrice = dec(pick(row, aliases.avgPrice));

  if (D(avgPrice).gt(0)) {
    return avgPrice;
  }

  const normalPrice = dec(pick(row, aliases.price));

  if (D(normalPrice).gt(0)) {
    return normalPrice;
  }

  return dec(pick(row, aliases.pricePerUnit));
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

    const status = String(pick(row, aliases.status) || "executed")
      .trim()
      .toLowerCase();

    const sideRaw = String(pick(row, aliases.side)).toUpperCase();

    const side =
      sideRaw.includes("SELL") || sideRaw === "S"
        ? "SELL"
        : sideRaw.includes("BUY") || sideRaw === "B"
          ? "BUY"
          : "";

    const pair = normalizePair(pick(row, aliases.pair));

    const quantity = getQuantity(row);
    const price = getPrice(row);

    const timeValue = pick(row, aliases.time);
    const executedAt = parseFlexibleDate(timeValue);

    // IMPORTANT:
    // If CSV has Status column, only completed trade rows should be counted.
    // For Order History CSV, only "filled" rows are real executed trades.
    // open / cancelled / rejected / pending rows must be ignored completely.
    const hasStatusColumn = String(pick(row, aliases.status) || "").trim() !== "";

    if (hasStatusColumn) {
      const validExecutedStatuses = ["filled", "executed", "closed", "completed"];

      if (!validExecutedStatuses.includes(status)) {
        filteredByStatus++;
        return;
      }
    }

    if (!side || !pair || D(quantity).lte(0) || D(price).lte(0)) {
      skippedCount++;
      warnings.push(
        `Row ${rowNumber}: missing/invalid side, pair, executed qty, or price`
      );
      return;
    }

    if (!executedAt) {
      skippedCount++;
      warnings.push(
        `Row ${rowNumber}: invalid date/time "${timeValue}". Row skipped.`
      );
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