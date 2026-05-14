'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatINR, formatQuantity } from '@/lib/utils/format'

interface HoldingCardProps {
  holding: Record<string, unknown>
}

function getAccentColor(totalBuyValue: string): string {
  const val = parseFloat(totalBuyValue) || 0
  if (val >= 100000) return '#f97316' // orange for high value
  if (val >= 10000) return '#14b8a6' // teal for medium value
  if (val > 0) return '#6b7280' // gray for low value
  return '#d1d5db' // light gray for zero
}

export function HoldingCard({ holding }: HoldingCardProps) {
  const pair = String(holding.pair ?? 'N/A')
  const remainingQty = holding.remainingQty ?? '0'
  const avgBuyPrice = holding.avgBuyPrice ?? '0'
  const totalBuyValue = holding.totalBuyValue ?? '0'
  const sourceCount = holding.sourceCount ?? 0

  const accentColor = getAccentColor(String(totalBuyValue))

  return (
    <Card
      className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/5 hover:scale-[1.01]"
      style={{ borderLeftWidth: '4px', borderLeftColor: accentColor }}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold text-xs"
          >
            {pair}
          </Badge>
          {sourceCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {sourceCount} lot{Number(sourceCount) > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Remaining Quantity */}
        <div className="mt-3">
          <div className="text-xs text-muted-foreground">Remaining Quantity</div>
          <div className="text-lg font-bold font-mono text-foreground">
            {formatQuantity(remainingQty)}
          </div>
        </div>

        {/* Details Row */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Avg Buy Price</div>
            <div className="text-sm font-semibold font-mono">
              {formatINR(avgBuyPrice)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total Buy Value</div>
            <div className="text-sm font-bold font-mono" style={{ color: accentColor }}>
              {formatINR(totalBuyValue)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
