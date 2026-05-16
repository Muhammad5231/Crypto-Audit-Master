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
    tax: String(plain.tax || plain.totalTax || plain.totalDirectTax || "0"),
    exchangeName: String(plain.exchangeName || "Default"),
    executedAt: plain.executedAt ? new Date(plain.executedAt) : new Date(),
    quantityOriginal: String(plain.quantity || plain.qty || "0"),
  };
}

function splitAmount(totalAmount, matchedQty, totalQty) {
  if (D(totalAmount).lte(0) || D(totalQty).lte(0)) return new Decimal(0);
  return D(totalAmount).mul(matchedQty).div(totalQty);
}

function calculateLine({
  buy,
  sell,
  qty,
  buyFeePart,
  sellFeePart,
  sellTaxPart,
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

  const sellTdsPart = splitAmount(
    sell.tds || 0,
    qty,
    sell.quantityOriginal || sell.quantity
  );

  const tds = sellTdsPart.gt(0) ? sellTdsPart : sellValue.mul(0.01);

  let baseCryptoTax = new Decimal(0);
  let cess = new Decimal(0);
  let totalDirectTax = new Decimal(0);

  if (grossProfit.gt(0)) {
    if (D(sellTaxPart).gt(0)) {
      totalDirectTax = D(sellTaxPart);
      baseCryptoTax = totalDirectTax.div(1.04);
      cess = totalDirectTax.minus(baseCryptoTax);
    } else {
      baseCryptoTax = grossProfit.mul(0.3);
      cess = baseCryptoTax.mul(0.04);
      totalDirectTax = baseCryptoTax.plus(cess);
    }
  }

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

function normalizeOpenHoldings(holdings = []) {
  const grouped = new Map();

  for (const holding of holdings) {
    const pair = String(holding?.pair || "").trim().toUpperCase();
    const remainingQty = D(
      holding?.remainingQty ??
      holding?.quantity ??
      0
    );

    if (!pair || remainingQty.lte(0)) continue;

    const totalBuyValue = D(
      holding?.totalBuyValue ??
      holding?.investedValue ??
      D(holding?.avgBuyPrice ?? holding?.averageBuyPrice ?? holding?.buyPrice ?? 0)
        .mul(remainingQty)
        .toString()
    );

    const group = grouped.get(pair) || {
      pair,
      remainingQty: new Decimal(0),
      totalBuyValue: new Decimal(0),
      sourceCount: 0,
      exchangeCount: {},
    };

    group.remainingQty = group.remainingQty.plus(remainingQty);
    group.totalBuyValue = group.totalBuyValue.plus(totalBuyValue);

    const sourceCount =
      Number(holding?.sourceCount) ||
      (Array.isArray(holding?.sourceLots) ? holding.sourceLots.length : 0) ||
      1;

    group.sourceCount += sourceCount;

    const exchangeName = String(
      holding?.exchangeName ||
      holding?.exchange ||
      "Default"
    ).trim() || "Default";

    group.exchangeCount[exchangeName] =
      (group.exchangeCount[exchangeName] || 0) + sourceCount;

    grouped.set(pair, group);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const avgBuyPrice = group.remainingQty.gt(0)
        ? group.totalBuyValue.div(group.remainingQty)
        : new Decimal(0);

      const exchangeName =
        Object.entries(group.exchangeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "Default";

      return {
        pair: group.pair,
        remainingQty: group.remainingQty.toString(),
        avgBuyPrice: avgBuyPrice.toString(),
        averageBuyPrice: avgBuyPrice.toString(),
        totalBuyValue: group.totalBuyValue.toString(),
        investedValue: group.totalBuyValue.toString(),
        sourceCount: group.sourceCount,
        exchangeName,
      };
    })
    .sort((a, b) => D(b.totalBuyValue).minus(a.totalBuyValue).toNumber());
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

      const buyFeePart = splitAmount(
        buyLot.fee,
        matchedQty,
        buyLot.quantityOriginal || buyLot.quantity
      );

      const sellFeePart = splitAmount(
        trade.fee,
        matchedQty,
        trade.quantityOriginal || trade.quantity
      );

      const sellTaxPart = splitAmount(
        trade.tax,
        matchedQty,
        trade.quantityOriginal || trade.quantity
      );

      const calc = calculateLine({
        buy: buyLot,
        sell: trade,
        qty: matchedQty,
        buyFeePart,
        sellFeePart,
        sellTaxPart,
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
        fees: calc.totalFees.toString(),

        gstOnFees: calc.gstOnFees.toString(),
        gst: calc.gstOnFees.toString(),

        tds: calc.tds.toString(),

        baseCryptoTax: calc.baseCryptoTax.toString(),
        tax: calc.baseCryptoTax.toString(),

        cess: calc.cess.toString(),
        healthEducationCess: calc.cess.toString(),

        totalDirectTax: calc.totalDirectTax.toString(),
        totalTax: calc.totalDirectTax.toString(),

        netProfitInHand: calc.netProfitInHand.toString(),
        netProfit: calc.netProfitInHand.toString(),

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

  const openHoldingLots = [];

  for (const [pair, lots] of Object.entries(buyLots)) {
    for (const lot of lots) {
      if (D(lot.remaining).gt(0)) {
        const investedValue = D(lot.remaining).mul(lot.price);

        openHoldingLots.push({
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

  const openHoldings = normalizeOpenHoldings(openHoldingLots);

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

  summary.fees = summary.totalFees;
  summary.gst = summary.gstOnFees;
  summary.tax = summary.baseCryptoTax;
  summary.totalTax = summary.totalDirectTax;
  summary.netProfit = summary.netProfitInHand;

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

module.exports = { runFifo, normalizeOpenHoldings };
