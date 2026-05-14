'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChevronDown, ChevronUp, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { formatINR, formatQuantity, getValueColor } from '@/lib/utils/format'
import { formatDate, formatTime } from '@/lib/utils/dateUtils'

interface TradeCardProps {
  trade: Record<string, unknown>
  onClick?: () => void
}

export function TradeCard({ trade, onClick }: TradeCardProps) {
  const [expanded, setExpanded] = useState(false)

  const pair = String(trade.pair ?? 'N/A')
  const buyDate = String(trade.buyDate ?? '')
  const sellDate = String(trade.sellDate ?? '')
  const matchedQty = trade.matchedQty ?? '0'
  const buyPrice = trade.buyPrice ?? '0'
  const sellPrice = trade.sellPrice ?? '0'
  const grossProfit = trade.grossProfit ?? '0'
  const totalFees = trade.totalFees ?? '0'
  const gstOnFees = trade.gstOnFees ?? '0'
  const tds = trade.tds ?? '0'
  const baseTax = trade.baseTax ?? '0'
  const totalDirectTax = trade.totalDirectTax ?? '0'
  const netProfit = trade.netProfit ?? '0'
  const finalNetProfit = trade.finalNetProfit ?? '0'

  const isProfit = parseFloat(String(grossProfit)) >= 0

  return (
    <Card
      className="overflow-hidden transition-all duration-200 active:scale-[0.98] group cursor-pointer"
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: isProfit ? '#10b981' : '#ef4444',
      }}
      onClick={onClick}
    >
      <CardContent className="p-3.5">
        {/* Header: Pair + Profit badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant="secondary"
              className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-[11px] shrink-0"
            >
              {pair}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatQuantity(matchedQty)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Inline profit indicator */}
            <div className="flex items-center gap-0.5 rounded-lg px-2 py-1 bg-muted/50">
              {isProfit ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={`text-[11px] font-bold font-mono ${getValueColor(grossProfit)}`}>
                {formatINR(grossProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Date range with time */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
          <span className="text-foreground font-medium">{formatDate(buyDate)}</span>
          <span className="text-muted-foreground text-[9px]">{formatTime(buyDate)}</span>
          <ArrowRight className="size-3 shrink-0 text-orange-500 mx-0.5" />
          <span className="text-foreground font-medium">{formatDate(sellDate)}</span>
          <span className="text-muted-foreground text-[9px]">{formatTime(sellDate)}</span>
        </div>

        {/* Key values row */}
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/30 px-2 py-1.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Buy</div>
            <div className="text-[11px] font-semibold font-mono text-foreground truncate">{formatINR(buyPrice)}</div>
          </div>
          <div className="rounded-lg bg-muted/30 px-2 py-1.5">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Sell</div>
            <div className="text-[11px] font-semibold font-mono text-foreground truncate">{formatINR(sellPrice)}</div>
          </div>
          <div className="rounded-lg bg-muted/30 px-2 py-1.5 text-right">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Final Net</div>
            <div className={`text-[11px] font-bold font-mono truncate ${getValueColor(finalNetProfit)}`}>
              {formatINR(finalNetProfit)}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          className="mt-2.5 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        >
          <span>{expanded ? 'Hide' : 'Show'} details</span>
          {expanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-1.5">
            <Separator className="mb-2.5" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Fees</div>
                <div className="text-[11px] font-medium font-mono text-red-400">{formatINR(totalFees)}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">GST on Fees</div>
                <div className="text-[11px] font-medium font-mono text-red-400">{formatINR(gstOnFees)}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">TDS Deducted</div>
                <div className="text-[11px] font-medium font-mono text-amber-500">{formatINR(tds)}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Base Tax (30%)</div>
                <div className="text-[11px] font-medium font-mono text-red-400">{formatINR(baseTax)}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Direct Tax</div>
                <div className="text-[11px] font-medium font-mono text-red-400">{formatINR(totalDirectTax)}</div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Net Profit</div>
                <div className={`text-[11px] font-medium font-mono ${getValueColor(netProfit)}`}>{formatINR(netProfit)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
