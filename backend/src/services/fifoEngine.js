const Decimal = require("decimal.js");

function D(value) {
  try {
    return new Decimal(value || 0);
  } catch {
    return new Decimal(0);
  }
}

function normalizeTrade(trade) {
  const plain = trade.toObject ? trade.toObject() : trade;

  return {
    ...plain,
    pair: String(plain.pair || plain.contract || "").trim().toUpperCase(),
    side: String(plain.side || "").trim().toUpperCase(),
    quantity: String(plain.quantity || plain.qty || "0"),
    price: String(plain.price || plain.execPrice || "0"),
    fee: String(plain.fee || plain.fees || "0"),
    tds: String(plain.tds || "0"),
    exchangeName: String(plain.exchangeName || "Default"),
    executedAt: plain.executedAt ? new Date(plain.executedAt) : new Date(),
    quantityOriginal: String(plain.quantity || plain.qty || "0"),
  };
}

function splitFee(totalFee, matchedQty, totalQty) {
  if (D(totalFee).lte(0) || D(totalQty).lte(0)) return new Decimal(0);
  return D(totalFee).mul(matchedQty).div(totalQty);
}

function calculateLine({
  buy,
  sell,
  qty,
  buyFeePart,
  sellFeePart,
  fallbackBuyPercent,
  fallbackSellPercent,
}) {
  const buyValue = D(qty).mul(buy.price);
  const sellValue = D(qty).mul(sell.price);
  const grossProfit = sellValue.minus(buyValue);

  const calculatedBuyFee = buyValue.mul(D(fallbackBuyPercent || 0)).div(100);
  const calculatedSellFee = sellValue.mul(D(fallbackSellPercent || 0)).div(100);

  const finalBuyFee = D(buyFeePart).gt(0) ? D(buyFeePart) : calculatedBuyFee;
  const finalSellFee = D(sellFeePart).gt(0) ? D(sellFeePart) : calculatedSellFee;

  const totalFees = finalBuyFee.plus(finalSellFee);

  const gstOnFees = totalFees.mul(0.18);

  const sellTdsPart = splitFee(
    sell.tds || 0,
    qty,
    sell.quantityOriginal || sell.quantity
  );

  const tds = sellTdsPart.gt(0) ? sellTdsPart : sellValue.mul(0.01);

  const baseCryptoTax = grossProfit.gt(0) ? grossProfit.mul(0.3) : new Decimal(0);
  const cess = baseCryptoTax.gt(0) ? baseCryptoTax.mul(0.04) : new Decimal(0);
  const totalDirectTax = baseCryptoTax.plus(cess);

  const netProfitInHand = grossProfit
    .minus(totalFees)
    .minus(gstOnFees)
    .minus(tds);

  const finalNetProfit = netProfitInHand.minus(totalDirectTax).plus(tds);

  return {
    buyValue,
    sellValue,
    grossProfit,
    totalFees,
    gstOnFees,
    tds,
    baseCryptoTax,
    cess,
    totalDirectTax,
    netProfitInHand,
    finalNetProfit,
  };
}

function runFifo(inputTrades, settingsMap = {}) {
  const trades = inputTrades
    .map(normalizeTrade)
    .filter((t) => {
      return (
        t.pair &&
        ["BUY", "SELL"].includes(t.side) &&
        D(t.quantity).gt(0) &&
        D(t.price).gt(0) &&
        !Number.isNaN(new Date(t.executedAt).getTime())
      );
    })
    .sort((a, b) => new Date(a.executedAt) - new Date(b.executedAt));

  const buyLots = {};
  const realizedTrades = [];
  const warnings = [];

  for (const trade of trades) {
    const pair = trade.pair;

    if (!buyLots[pair]) buyLots[pair] = [];

    if (trade.side === "BUY") {
      buyLots[pair].push({
        ...trade,
        remaining: D(trade.quantity),
      });
      continue;
    }

    let sellRemaining = D(trade.quantity);

    while (sellRemaining.gt(0) && buyLots[pair].length > 0) {
      const buyLot = buyLots[pair][0];
      const matchedQty = Decimal.min(sellRemaining, buyLot.remaining);

      const setting =
        settingsMap[trade.exchangeName] ||
        settingsMap.Default ||
        settingsMap.default ||
        {
          buyFeePercent: "0.1",
          sellFeePercent: "0.1",
        };

      const buyFeePart = splitFee(
        buyLot.fee,
        matchedQty,
        buyLot.quantityOriginal || buyLot.quantity
      );

      const sellFeePart = splitFee(
        trade.fee,
        matchedQty,
        trade.quantityOriginal || trade.quantity
      );

      const calc = calculateLine({
        buy: buyLot,
        sell: trade,
        qty: matchedQty,
        buyFeePart,
        sellFeePart,
        fallbackBuyPercent: setting.buyFeePercent,
        fallbackSellPercent: setting.sellFeePercent,
      });

      realizedTrades.push({
        pair,
        exchangeName: trade.exchangeName,
        matchedQty: matchedQty.toString(),

        buyDate: buyLot.executedAt,
        sellDate: trade.executedAt,

        buyPrice: buyLot.price,
        sellPrice: trade.price,

        buyValue: calc.buyValue.toString(),
        sellValue: calc.sellValue.toString(),
        grossProfit: calc.grossProfit.toString(),

        totalFees: calc.totalFees.toString(),
        gstOnFees: calc.gstOnFees.toString(),
        tds: calc.tds.toString(),

        baseCryptoTax: calc.baseCryptoTax.toString(),
        cess: calc.cess.toString(),
        healthEducationCess: calc.cess.toString(),
        totalDirectTax: calc.totalDirectTax.toString(),

        netProfitInHand: calc.netProfitInHand.toString(),
        finalNetProfit: calc.finalNetProfit.toString(),
      });

      buyLot.remaining = buyLot.remaining.minus(matchedQty);
      sellRemaining = sellRemaining.minus(matchedQty);

      if (buyLot.remaining.lte(0)) {
        buyLots[pair].shift();
      }
    }

    if (sellRemaining.gt(0)) {
      warnings.push(
        `Unmatched SELL ${pair}: ${sellRemaining.toString()} quantity has no previous BUY lot`
      );
    }
  }

  const openHoldings = [];

  for (const [pair, lots] of Object.entries(buyLots)) {
    for (const lot of lots) {
      if (D(lot.remaining).gt(0)) {
        const investedValue = D(lot.remaining).mul(lot.price);

        openHoldings.push({
          pair,
          exchangeName: lot.exchangeName,
          quantity: lot.remaining.toString(),
          buyPrice: lot.price,
          buyDate: lot.executedAt,
          investedValue: investedValue.toString(),
          currentValue: investedValue.toString(),
        });
      }
    }
  }

  const summary = realizedTrades.reduce(
    (acc, trade) => {
      [
        "buyValue",
        "sellValue",
        "grossProfit",
        "totalFees",
        "gstOnFees",
        "tds",
        "baseCryptoTax",
        "cess",
        "totalDirectTax",
        "netProfitInHand",
        "finalNetProfit",
      ].forEach((key) => {
        acc[key] = D(acc[key]).plus(trade[key]).toString();
      });

      return acc;
    },
    {
      buyValue: "0",
      sellValue: "0",
      grossProfit: "0",
      totalFees: "0",
      gstOnFees: "0",
      tds: "0",
      baseCryptoTax: "0",
      cess: "0",
      totalDirectTax: "0",
      netProfitInHand: "0",
      finalNetProfit: "0",
    }
  );

  summary.totalTrades = realizedTrades.length;
  summary.openHoldings = openHoldings.length;
  summary.inputTrades = trades.length;

  return {
    realizedTrades,
    openHoldings,
    summary,
    warnings,
  };
}

module.exports = { runFifo };