import Decimal from 'decimal.js';
import { TAX_CONFIG } from '@/lib/config/taxConfig';
import type { RealizedTrade, OpenHolding } from './fifoEngine';

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaxCalculationInput {
  grossProfit: string; // Decimal string
  buyFee: string;
  sellFee: string;
  sellValue: string;
}

export interface TaxResult {
  grossProfit: string;
  buyFee: string;
  sellFee: string;
  totalFees: string;
  gstOnFees: string;
  tds: string;
  baseCryptoTax: string;
  cess: string;
  totalDirectTax: string;
  netProfitInHand: string;
  finalNetProfit: string;
}

// ─── Tax Calculation ────────────────────────────────────────────────────────

/**
 * Calculate India VDA (Virtual Digital Asset) taxes for a single realized trade.
 *
 * Tax model (all using Decimal.js):
 * - totalFees        = buyFee + sellFee
 * - gstOnFees        = totalFees × GST_RATE (18%)
 * - tds              = sellValue × TDS_RATE (1%)
 * - baseCryptoTax    = grossProfit × BASE_CRYPTO_TAX (30%)  [only if profit > 0]
 * - cess             = baseCryptoTax × CESS_RATE (4%)       [only if profit > 0]
 * - totalDirectTax   = baseCryptoTax + cess
 * - netProfitInHand  = grossProfit - totalFees - gstOnFees - tds - totalDirectTax
 * - finalNetProfit   = netProfitInHand + tds
 */
export function calculateTax(input: TaxCalculationInput): TaxResult {
  const grossProfit = new Decimal(input.grossProfit);
  const buyFee = new Decimal(input.buyFee);
  const sellFee = new Decimal(input.sellFee);
  const sellValue = new Decimal(input.sellValue);

  // totalFees = buyFee + sellFee
  const totalFees = buyFee.plus(sellFee);

  // gstOnFees = totalFees × 0.18
  const gstOnFees = totalFees.times(TAX_CONFIG.GST_RATE);

  // tds = sellValue × 0.01
  const tds = sellValue.times(TAX_CONFIG.TDS_RATE);

  // baseCryptoTax: only if grossProfit > 0
  let baseCryptoTax: Decimal;
  let cess: Decimal;

  if (grossProfit.gt(0)) {
    baseCryptoTax = grossProfit.times(TAX_CONFIG.BASE_CRYPTO_TAX);
    cess = baseCryptoTax.times(TAX_CONFIG.CESS_RATE);
  } else {
    baseCryptoTax = new Decimal(0);
    cess = new Decimal(0);
  }

  // totalDirectTax = baseCryptoTax + cess
  const totalDirectTax = baseCryptoTax.plus(cess);

  // netProfitInHand = grossProfit - totalFees - gstOnFees - tds - totalDirectTax
  const netProfitInHand = grossProfit
    .minus(totalFees)
    .minus(gstOnFees)
    .minus(tds)
    .minus(totalDirectTax);

  // finalNetProfit = netProfitInHand + tds (TDS is recoverable)
  const finalNetProfit = netProfitInHand.plus(tds);

  return {
    grossProfit: grossProfit.toString(),
    buyFee: buyFee.toString(),
    sellFee: sellFee.toString(),
    totalFees: totalFees.toString(),
    gstOnFees: gstOnFees.toString(),
    tds: tds.toString(),
    baseCryptoTax: baseCryptoTax.toString(),
    cess: cess.toString(),
    totalDirectTax: totalDirectTax.toString(),
    netProfitInHand: netProfitInHand.toString(),
    finalNetProfit: finalNetProfit.toString(),
  };
}

// ─── Analytics Calculation ───────────────────────────────────────────────────

/**
 * Aggregate analytics across all realized trades and open holdings.
 *
 * Returns a summary object with monetary totals (as strings) and counts (as numbers).
 */
export function calculateAnalytics(
  realizedTrades: RealizedTrade[],
  openHoldings: OpenHolding[],
): Record<string, string | number> {
  // Running totals using Decimal
  let totalBuyValue = new Decimal(0);
  let totalSellValue = new Decimal(0);
  let totalGrossProfit = new Decimal(0);
  let totalFees = new Decimal(0);
  let totalGst = new Decimal(0);
  let totalTds = new Decimal(0);
  let totalBaseTax = new Decimal(0);
  let totalCess = new Decimal(0);
  let totalDirectTax = new Decimal(0);
  let totalNetProfit = new Decimal(0);
  let totalFinalNet = new Decimal(0);

  // Counters
  let profitableTrades = 0;
  let lossTrades = 0;

  // Per-pair profit tracking
  const pairProfits: Record<string, Decimal> = {};

  for (const trade of realizedTrades) {
    totalBuyValue = totalBuyValue.plus(new Decimal(trade.buyValue));
    totalSellValue = totalSellValue.plus(new Decimal(trade.sellValue));
    totalGrossProfit = totalGrossProfit.plus(new Decimal(trade.grossProfit));
    totalFees = totalFees.plus(new Decimal(trade.totalFees));
    totalGst = totalGst.plus(new Decimal(trade.gstOnFees));
    totalTds = totalTds.plus(new Decimal(trade.tds));
    totalBaseTax = totalBaseTax.plus(new Decimal(trade.baseCryptoTax));
    totalCess = totalCess.plus(new Decimal(trade.cess));
    totalDirectTax = totalDirectTax.plus(new Decimal(trade.totalDirectTax));
    totalNetProfit = totalNetProfit.plus(new Decimal(trade.netProfitInHand));
    totalFinalNet = totalFinalNet.plus(new Decimal(trade.finalNetProfit));

    const gp = new Decimal(trade.grossProfit);
    if (gp.gt(0)) {
      profitableTrades++;
    } else if (gp.lt(0)) {
      lossTrades++;
    }

    // Track per-pair profit
    if (!pairProfits[trade.pair]) {
      pairProfits[trade.pair] = new Decimal(0);
    }
    pairProfits[trade.pair] = pairProfits[trade.pair].plus(new Decimal(trade.finalNetProfit));
  }

  // Determine best and worst pairs by final net profit
  let bestPair = '—';
  let worstPair = '—';
  let bestProfit = new Decimal(-Infinity);
  let worstProfit = new Decimal(Infinity);

  for (const [pair, profit] of Object.entries(pairProfits)) {
    if (profit.gt(bestProfit)) {
      bestProfit = profit;
      bestPair = pair;
    }
    if (profit.lt(worstProfit)) {
      worstProfit = profit;
      worstPair = pair;
    }
  }

  // If no trades, reset to zero display
  if (realizedTrades.length === 0) {
    bestProfit = new Decimal(0);
    worstProfit = new Decimal(0);
  }

  return {
    // Monetary totals (strings)
    totalBuyValue: totalBuyValue.toString(),
    totalSellValue: totalSellValue.toString(),
    totalGrossProfit: totalGrossProfit.toString(),
    totalFees: totalFees.toString(),
    totalGst: totalGst.toString(),
    totalTds: totalTds.toString(),
    totalBaseTax: totalBaseTax.toString(),
    totalCess: totalCess.toString(),
    totalDirectTax: totalDirectTax.toString(),
    totalNetProfit: totalNetProfit.toString(),
    totalFinalNet: totalFinalNet.toString(),

    // Counts (numbers)
    realizedTradeCount: realizedTrades.length,
    holdingsCount: openHoldings.length,
    profitableTrades,
    lossTrades,

    // Best / worst pairs
    bestPair,
    worstPair,
  };
}
