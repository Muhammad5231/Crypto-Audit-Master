import Decimal from 'decimal.js';
import { calculateTax } from './taxCalculator';

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TradeInput {
  pair: string;
  side: string; // BUY or SELL
  quantity: string;
  price: string;
  fees: string;
  executedAt: string; // ISO date string
  csvFileId: string;
  sourceFile: string;
}

export interface RealizedTrade {
  pair: string;
  buyDate: string;
  sellDate: string;
  matchedQty: string;
  buyPrice: string;
  sellPrice: string;
  buyValue: string;
  sellValue: string;
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
  sourceFileIds: string[];
}

export interface OpenHolding {
  pair: string;
  remainingQty: string;
  averageBuyPrice: string;
  totalBuyValue: string;
  sourceLots: Array<{
    buyDate: string;
    qty: string;
    price: string;
    csvFileId: string;
  }>;
  exchange: string;
}

export interface FeeSettingsEntry {
  buyFeePercent: string;
  sellFeePercent: string;
}

export interface FifoResult {
  realizedTrades: RealizedTrade[];
  openHoldings: OpenHolding[];
  warnings: string[];
}

// ─── Internal Buy Lot type for the FIFO queue ───────────────────────────────

interface BuyLot {
  buyDate: string;
  qty: Decimal;
  price: string; // original string price
  csvFileId: string;
  sourceFile: string; // used to resolve exchange & fee % for buy side
  pair: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the exchange name from the sourceFile by matching against feeSettings keys.
 * Falls back to "default" (which maps to 0.1% via DEFAULT_FEE_PERCENT).
 */
function resolveExchange(
  sourceFile: string,
  feeSettings: Record<string, FeeSettingsEntry>,
): string {
  const lower = sourceFile.toLowerCase();
  for (const exchange of Object.keys(feeSettings)) {
    if (lower.includes(exchange.toLowerCase())) {
      return exchange;
    }
  }
  return 'default';
}

const DEFAULT_FEE_PERCENT = '0.001'; // 0.1%

/**
 * Return the fee percentage (as Decimal) for a given exchange and side.
 */
function getFeePercent(
  exchange: string,
  side: 'BUY' | 'SELL',
  feeSettings: Record<string, FeeSettingsEntry>,
): Decimal {
  const entry = feeSettings[exchange];
  if (!entry) return new Decimal(DEFAULT_FEE_PERCENT);
  return new Decimal(side === 'BUY' ? entry.buyFeePercent : entry.sellFeePercent);
}

// ─── Main FIFO Engine ────────────────────────────────────────────────────────

export function runFifoMatching(
  trades: TradeInput[],
  feeSettings: Record<string, FeeSettingsEntry> = {},
): FifoResult {
  const warnings: string[] = [];
  const realizedTrades: RealizedTrade[] = [];

  // 1. Sort trades by executedAt ascending (stable sort keeps CSV order for ties)
  const sorted = [...trades].sort((a, b) => {
    const timeA = new Date(a.executedAt).getTime();
    const timeB = new Date(b.executedAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return 0;
  });

  // 2. Group trades by pair
  const pairGroups: Record<string, TradeInput[]> = {};
  for (const trade of sorted) {
    const pair = trade.pair.trim();
    if (!pair) continue;
    if (!pairGroups[pair]) pairGroups[pair] = [];
    pairGroups[pair].push(trade);
  }

  // 3. Process each pair independently
  const allOpenHoldings: OpenHolding[] = [];

  for (const [pair, groupTrades] of Object.entries(pairGroups)) {
    const buyQueue: BuyLot[] = [];

    for (const trade of groupTrades) {
      const tradeQty = new Decimal(trade.quantity);
      const tradePrice = new Decimal(trade.price);

      if (trade.side.toUpperCase() === 'BUY') {
        // Enqueue buy lot
        buyQueue.push({
          buyDate: trade.executedAt,
          qty: tradeQty,
          price: trade.price,
          csvFileId: trade.csvFileId,
          sourceFile: trade.sourceFile,
          pair,
        });
      } else if (trade.side.toUpperCase() === 'SELL') {
        // Match against oldest buy lots (FIFO)
        let remainingSellQty = tradeQty;
        const sellSourceFile = trade.sourceFile;
        const sellExchange = resolveExchange(sellSourceFile, feeSettings);
        const sellFeePercent = getFeePercent(sellExchange, 'SELL', feeSettings);

        const matchedBuyIds: string[] = [];
        matchedBuyIds.push(trade.csvFileId);

        while (remainingSellQty.gt(0)) {
          if (buyQueue.length === 0) {
            // No more buy lots to match against
            warnings.push(
              `Unmatched SELL of ${remainingSellQty.toFixed(8)} ${pair} on ${trade.executedAt} (source: ${trade.sourceFile}). No prior BUY lots available.`,
            );
            break;
          }

          const oldestBuy = buyQueue[0];
          const matchedQty = Decimal.min(remainingSellQty, oldestBuy.qty);

          // Calculate proportional buy fee
          const buyExchange = resolveExchange(oldestBuy.sourceFile, feeSettings);
          const buyFeePercent = getFeePercent(buyExchange, 'BUY', feeSettings);
          const buyPriceDec = new Decimal(oldestBuy.price);
          const buyFee = matchedQty.times(buyPriceDec).times(buyFeePercent);

          // Calculate proportional sell fee
          const sellFee = matchedQty.times(tradePrice).times(sellFeePercent);

          // Values
          const buyValue = matchedQty.times(buyPriceDec);
          const sellValue = matchedQty.times(tradePrice);
          const grossProfit = sellValue.minus(buyValue);

          // Tax calculation
          const taxResult = calculateTax({
            grossProfit: grossProfit.toString(),
            buyFee: buyFee.toString(),
            sellFee: sellFee.toString(),
            sellValue: sellValue.toString(),
          });

          // Track source file IDs
          const sourceIds = [oldestBuy.csvFileId, trade.csvFileId];

          realizedTrades.push({
            pair,
            buyDate: oldestBuy.buyDate,
            sellDate: trade.executedAt,
            matchedQty: matchedQty.toString(),
            buyPrice: oldestBuy.price,
            sellPrice: trade.price,
            buyValue: buyValue.toString(),
            sellValue: sellValue.toString(),
            grossProfit: taxResult.grossProfit,
            buyFee: taxResult.buyFee,
            sellFee: taxResult.sellFee,
            totalFees: taxResult.totalFees,
            gstOnFees: taxResult.gstOnFees,
            tds: taxResult.tds,
            baseCryptoTax: taxResult.baseCryptoTax,
            cess: taxResult.cess,
            totalDirectTax: taxResult.totalDirectTax,
            netProfitInHand: taxResult.netProfitInHand,
            finalNetProfit: taxResult.finalNetProfit,
            sourceFileIds: sourceIds,
          });

          // Consume the matched quantity from the buy lot
          oldestBuy.qty = oldestBuy.qty.minus(matchedQty);
          remainingSellQty = remainingSellQty.minus(matchedQty);

          // Remove fully consumed buy lot from queue
          if (oldestBuy.qty.lte(0)) {
            buyQueue.shift();
          }
        }
      }
    }

    // 4. Remaining buy lots become Open Holdings
    if (buyQueue.length > 0) {
      // Group by exchange for the holding
      let totalRemainingQty = new Decimal(0);
      let totalBuyValue = new Decimal(0);
      const sourceLots: OpenHolding['sourceLots'] = [];

      for (const lot of buyQueue) {
        const lotValue = lot.qty.times(new Decimal(lot.price));
        totalRemainingQty = totalRemainingQty.plus(lot.qty);
        totalBuyValue = totalBuyValue.plus(lotValue);

        sourceLots.push({
          buyDate: lot.buyDate,
          qty: lot.qty.toString(),
          price: lot.price,
          csvFileId: lot.csvFileId,
        });
      }

      // Average buy price = total value / total qty
      const avgBuyPrice =
        totalRemainingQty.gt(0) ? totalBuyValue.div(totalRemainingQty) : new Decimal(0);

      // Determine exchange (use the most common sourceFile exchange)
      const exchangeCounts: Record<string, number> = {};
      for (const lot of buyQueue) {
        const ex = resolveExchange(lot.sourceFile, feeSettings);
        exchangeCounts[ex] = (exchangeCounts[ex] || 0) + 1;
      }
      const primaryExchange =
        Object.entries(exchangeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'default';

      allOpenHoldings.push({
        pair,
        remainingQty: totalRemainingQty.toString(),
        averageBuyPrice: avgBuyPrice.toString(),
        totalBuyValue: totalBuyValue.toString(),
        sourceLots,
        exchange: primaryExchange,
      });
    }
  }

  // Sort realized trades by sellDate for consistent output
  realizedTrades.sort((a, b) => {
    const tA = new Date(a.sellDate).getTime();
    const tB = new Date(b.sellDate).getTime();
    if (tA !== tB) return tA - tB;
    return a.pair.localeCompare(b.pair);
  });

  // Sort open holdings by total value descending
  allOpenHoldings.sort((a, b) => {
    return new Decimal(b.totalBuyValue).minus(new Decimal(a.totalBuyValue)).toNumber();
  });

  return {
    realizedTrades,
    openHoldings: allOpenHoldings,
    warnings,
  };
}
