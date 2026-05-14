'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { reportApi, exportApi } from '@/lib/api'
import { formatINR, formatQuantity, getValueColor } from '@/lib/utils/format'
import { formatDate, formatTime } from '@/lib/utils/dateUtils'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileX2,
  Search,
  X,
  Upload,
  Play,
  Download,
  TrendingUp,
  TrendingDown,
  Trophy,
  BarChart3,
  Target,
} from 'lucide-react'
import { TradeCard } from './TradeCard'
import { Trade } from './TradeDetailModal'
import { useAppStore } from '@/store/appStore'

const PAGE_SIZE = 10

type SortField = 'sellDate' | 'grossProfit' | 'pair' | 'finalNetProfit' | 'netProfit'
type SortOrder = 'asc' | 'desc'

export function RealizedTradesView() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace)
  const isMobile = useIsMobile()

  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pairFilter, setPairFilter] = useState<string>('all')
  const [fyFilter, setFyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('sellDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)

  // Export handler
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = async () => {
    if (!activeWorkspace?.id) return
    setIsExporting(true)
    try {
      const blob = await exportApi.exportCsv(activeWorkspace.id, {
        includeHeaders: true,
        includeTaxSummary: true,
      })
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `realized-trades-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Exported trades successfully')
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  // Fetch trades
  const fetchTrades = useCallback(async () => {
    if (!activeWorkspace?.id) return
    setIsLoading(true)
    try {
      const result = await reportApi.getRealizedTrades(activeWorkspace.id, {
        limit: '500',
        sort: sortBy,
        order: sortOrder,
      })
      const tradesList = (result as any).trades ?? []
      const pagination = (result as any).pagination

      if (pagination && pagination.totalPages > 1) {
        const allPages: Trade[] = [...tradesList]
        for (let p = 2; p <= pagination.totalPages; p++) {
          const pageResult = await reportApi.getRealizedTrades(activeWorkspace.id, {
            limit: '500',
            page: String(p),
            sort: sortBy,
            order: sortOrder,
          })
          allPages.push(...((pageResult as any).trades ?? []))
        }
        setAllTrades(allPages)
      } else {
        setAllTrades(tradesList)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load trades')
      setAllTrades([])
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace?.id])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // Unique pairs
  const uniquePairs = useMemo(() => {
    const pairs = new Set(allTrades.map((t) => t.pair))
    return Array.from(pairs).sort()
  }, [allTrades])

  // Auto-detect FYs
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>()
    for (const trade of allTrades) {
      const sellDate = new Date(trade.sellDate)
      const month = sellDate.getMonth() + 1
      const year = sellDate.getFullYear()
      const fy = month >= 4 ? year : year - 1
      fySet.add(fy)
    }
    return Array.from(fySet).sort((a, b) => b - a)
  }, [allTrades])

  const formatFY = (fyYear: number) => `FY ${fyYear}-${String(fyYear + 1).slice(2)}`

  const isTradeInFY = (trade: Trade, fyYear: number): boolean => {
    const sellDate = new Date(trade.sellDate)
    const month = sellDate.getMonth() + 1
    const year = sellDate.getFullYear()
    const tradeFY = month >= 4 ? year : year - 1
    return tradeFY === fyYear
  }

  // Apply filters
  const filteredTrades = useMemo(() => {
    let result = allTrades

    if (pairFilter !== 'all') {
      result = result.filter((t) => t.pair.toUpperCase() === pairFilter.toUpperCase())
    }
    if (fyFilter !== 'all') {
      const fyYear = parseInt(fyFilter, 10)
      result = result.filter((t) => isTradeInFY(t, fyYear))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter((t) => {
        if (t.pair.toLowerCase().includes(q)) return true
        if (formatDate(t.buyDate).toLowerCase().includes(q)) return true
        if (formatDate(t.sellDate).toLowerCase().includes(q)) return true
        if (formatINR(t.grossProfit).toLowerCase().includes(q)) return true
        return false
      })
    }
    return result
  }, [allTrades, pairFilter, fyFilter, searchQuery])

  // Sort
  const sortedTrades = useMemo(() => {
    const sorted = [...filteredTrades]
    const mult = sortOrder === 'asc' ? 1 : -1
    sorted.sort((a, b) => {
      if (sortBy === 'pair') return a.pair.localeCompare(b.pair) * mult
      if (sortBy === 'grossProfit') return (parseFloat(a.grossProfit) - parseFloat(b.grossProfit)) * mult
      if (sortBy === 'netProfit') return (parseFloat(a.netProfit) - parseFloat(b.netProfit)) * mult
      if (sortBy === 'finalNetProfit') return (parseFloat(a.finalNetProfit) - parseFloat(b.finalNetProfit)) * mult
      return (new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime()) * mult
    })
    return sorted
  }, [filteredTrades, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedTrades = useMemo(() => {
    return sortedTrades.slice(startIndex, startIndex + PAGE_SIZE)
  }, [sortedTrades, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [pairFilter, fyFilter, sortBy, sortOrder, searchQuery])

  // Summary stats from filtered trades
  const summaryStats = useMemo(() => {
    const trades = filteredTrades
    const totalRealizedProfit = trades.reduce((s, t) => s + (parseFloat(t.grossProfit) || 0), 0)
    const totalTrades = trades.length
    const winTrades = trades.filter((t) => (parseFloat(t.grossProfit) || 0) > 0).length
    const losingTrades = trades.filter((t) => (parseFloat(t.grossProfit) || 0) < 0).length
    const winRate = totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(1) : "0.0"
    return { totalRealizedProfit, totalTrades, winTrades, losingTrades, winRate }
  }, [filteredTrades])

  // Grand totals
  const grandTotals = useMemo(() => {
    return filteredTrades.reduce(
      (acc, t) => ({
        buyValue: acc.buyValue + (parseFloat(t.buyValue) || 0),
        sellValue: acc.sellValue + (parseFloat(t.sellValue) || 0),
        grossProfit: acc.grossProfit + (parseFloat(t.grossProfit) || 0),
        totalFees: acc.totalFees + (parseFloat(t.totalFees) || 0),
        gstOnFees: acc.gstOnFees + (parseFloat(t.gstOnFees) || 0),
        tds: acc.tds + (parseFloat(t.tds) || 0),
        baseTax: acc.baseTax + (parseFloat(t.baseTax) || 0),
        cess: acc.cess + (parseFloat(t.cess) || 0),
        totalDirectTax: acc.totalDirectTax + (parseFloat(t.totalDirectTax) || 0),
        netProfit: acc.netProfit + (parseFloat(t.netProfit) || 0),
        finalNetProfit: acc.finalNetProfit + (parseFloat(t.finalNetProfit) || 0),
      }),
      {
        buyValue: 0, sellValue: 0, grossProfit: 0,
        totalFees: 0, gstOnFees: 0, tds: 0, baseTax: 0, cess: 0,
        totalDirectTax: 0, netProfit: 0, finalNetProfit: 0,
      }
    )
  }, [filteredTrades])

  const handleSortToggle = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // ─── Loading skeleton ────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────
  if (allTrades.length === 0) {
    const setCurrentView = useAppStore.getState().setCurrentView
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          animate={{ y: [0, -8, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex size-20 items-center justify-center rounded-3xl bg-muted/30 backdrop-blur-sm border border-border/30">
            <FileX2 className="size-10 text-muted-foreground" />
          </div>
        </motion.div>
        <h3 className="mt-6 text-lg font-semibold text-foreground">No Realized Trades</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
          Upload your exchange CSV files and run the process step to generate
          realized trades via FIFO matching.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentView('upload')} className="rounded-xl">
            <Upload className="h-4 w-4 mr-1.5" />Upload CSV
          </Button>
          <Button onClick={() => setCurrentView('upload')} className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
            <Play className="h-4 w-4 mr-1.5" />Process Trades
          </Button>
        </div>
      </div>
    )
  }

  // ─── Filtered empty state ────────────────────────────
  if (filteredTrades.length === 0) {
    return (
      <div className="space-y-4">
        <FilterControls
          uniquePairs={uniquePairs}
          availableFYs={availableFYs}
          pairFilter={pairFilter}
          fyFilter={fyFilter}
          searchQuery={searchQuery}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onPairChange={setPairFilter}
          onFyChange={setFyFilter}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onOrderChange={setSortOrder}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/30 backdrop-blur-sm border border-border/30">
              <Search className="size-6 text-muted-foreground" />
            </div>
          </motion.div>
          <p className="mt-4 text-sm text-muted-foreground">No trades found for the selected filters.</p>
          <Button variant="ghost" size="sm" className="mt-3 text-xs rounded-xl" onClick={() => { setPairFilter('all'); setFyFilter('all'); setSearchQuery('') }}>
            Clear all filters
          </Button>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Summary Key Cards ──────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="rounded-xl bg-card/80 border shadow-sm p-2.5 lg:p-3">
          <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
            <div className="flex h-6 w-6 lg:h-7 lg:w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-emerald-500" />
            </div>
            <span className="text-[9px] lg:text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">Total Profit</span>
          </div>
          <p className={`text-sm lg:text-base font-bold font-mono ${getValueColor(summaryStats.totalRealizedProfit)}`}>
            {formatINR(summaryStats.totalRealizedProfit)}
          </p>
        </Card>
        <Card className="rounded-xl bg-card/80 border shadow-sm p-2.5 lg:p-3">
          <div className="flex items-center gap-1.5 lg:gap-2 mb-1">
            <div className="flex h-6 w-6 lg:h-7 lg:w-7 items-center justify-center rounded-lg bg-blue-500/10">
              <BarChart3 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-blue-500" />
            </div>
            <span className="text-[9px] lg:text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Trades</span>
          </div>
          <p className="text-sm lg:text-base font-bold font-mono text-foreground">{summaryStats.totalTrades}</p>
        </Card>
        <Card className="rounded-xl bg-card/80 border shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10">
              <Trophy className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Win Trades</span>
          </div>
          <p className="text-base font-bold font-mono text-emerald-500">{summaryStats.winTrades}</p>
        </Card>
        <Card className="rounded-xl bg-card/80 border shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Losing Trades</span>
          </div>
          <p className="text-base font-bold font-mono text-red-500">{summaryStats.losingTrades}</p>
        </Card>
        <Card className="rounded-xl bg-card/80 border shadow-sm p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
              <Target className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Win Rate</span>
          </div>
          <p className="text-base font-bold font-mono text-foreground">{summaryStats.winRate}%</p>
        </Card>
      </motion.div>

      {/* Filter bar */}
      <FilterControls
        uniquePairs={uniquePairs}
        availableFYs={availableFYs}
        pairFilter={pairFilter}
        fyFilter={fyFilter}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onPairChange={setPairFilter}
        onFyChange={setFyFilter}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        onOrderChange={setSortOrder}
      />

      {/* Header row: count + export */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredTrades.length)}</span> of{' '}
          <span className="font-medium text-foreground">{filteredTrades.length}</span> trades
          {filteredTrades.length !== allTrades.length && (
            <span className="text-muted-foreground/60"> ({allTrades.length} total)</span>
          )}
          {pairFilter !== 'all' && <Badge variant="secondary" className="ml-2 text-xs">{pairFilter}</Badge>}
          {fyFilter !== 'all' && <Badge variant="secondary" className="ml-2 text-xs">{formatFY(parseInt(fyFilter, 10))}</Badge>}
          {searchQuery.trim() && (
            <Badge variant="outline" className="ml-2 text-xs gap-1">
              <Search className="h-2.5 w-2.5" />&quot;{searchQuery}&quot;
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 h-8" onClick={handleExport} disabled={isExporting}>
          <Download className="h-3.5 w-3.5" />{isExporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Mobile: Card list (no detail modal) */}
      {isMobile ? (
        <div className="space-y-3">
          {paginatedTrades.map((trade, idx) => (
            <TradeCard key={`${trade.pair}-${trade.buyDate}-${trade.sellDate}-${idx + startIndex}`} trade={trade} />
          ))}
        </div>
      ) : (
        /* Desktop: Full table */
        <Card className="p-0 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[1500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSortToggle('pair')}>
                      <div className="flex items-center gap-1">Pair<ArrowUpDown className="size-3" /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSortToggle('sellDate')}>
                      <div className="flex items-center gap-1">Buy Date<ArrowUpDown className="size-3" /></div>
                    </TableHead>
                    <TableHead>Sell Date</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Buy Value</TableHead>
                    <TableHead className="text-right">Sell Value</TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSortToggle('grossProfit')}
                    >
                      <div className="flex items-center justify-end gap-1">Gross Profit<ArrowUpDown className="size-3" /></div>
                    </TableHead>
                    <TableHead className="text-right">Total Fees</TableHead>
                    <TableHead className="text-right">GST on Fees</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Cess (4%)</TableHead>
                    <TableHead className="text-right">Total Direct Tax</TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSortToggle('netProfit')}
                    >
                      <div className="flex items-center justify-end gap-1">Net Profit<ArrowUpDown className="size-3" /></div>
                    </TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none font-bold"
                      onClick={() => handleSortToggle('finalNetProfit')}
                    >
                      <div className="flex items-center justify-end gap-1">Final Net Profit<ArrowUpDown className="size-3" /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTrades.map((trade, idx) => {
                    const rowNum = startIndex + idx + 1
                    return (
                      <TableRow key={`${trade.pair}-${trade.buyDate}-${trade.sellDate}-${idx + startIndex}`} className="hover:bg-muted/60 transition-colors">
                        <TableCell className="text-center text-muted-foreground text-xs font-mono">{rowNum}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-teal-500/10 text-teal-700 dark:text-teal-400 font-semibold text-xs whitespace-nowrap">
                            {trade.pair}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm font-medium text-foreground">{formatDate(trade.buyDate)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatTime(trade.buyDate)}</div>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-sm font-medium text-foreground">{formatDate(trade.sellDate)}</div>
                          <div className="text-[10px] text-muted-foreground">{formatTime(trade.sellDate)}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatQuantity(trade.matchedQty)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatINR(trade.buyValue)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">{formatINR(trade.sellValue)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${getValueColor(trade.grossProfit)}`}>
                          {formatINR(trade.grossProfit)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400">{formatINR(trade.totalFees)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400">{formatINR(trade.gstOnFees)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-amber-500">{formatINR(trade.tds)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400">{formatINR(trade.baseTax)}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400">{formatINR(trade.cess ?? '0')}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-red-400 font-semibold">{formatINR(trade.totalDirectTax)}</TableCell>
                        <TableCell className={`text-right font-mono text-sm font-semibold ${getValueColor(trade.netProfit)}`}>
                          {formatINR(trade.netProfit)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm font-bold ${getValueColor(trade.finalNetProfit)}`}>
                          {formatINR(trade.finalNetProfit)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableCell className="font-bold text-foreground text-center" colSpan={2}>
                      Total ({filteredTrades.length})
                    </TableCell>
                    <TableCell colSpan={3} />
                    <TableCell className="text-right font-mono text-sm font-semibold text-muted-foreground">{formatINR(grandTotals.buyValue)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-muted-foreground">{formatINR(grandTotals.sellValue)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${getValueColor(grandTotals.grossProfit)}`}>{formatINR(grandTotals.grossProfit)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-400 font-semibold">{formatINR(grandTotals.totalFees)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-400 font-semibold">{formatINR(grandTotals.gstOnFees)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-amber-500 font-semibold">{formatINR(grandTotals.tds)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-400 font-semibold">{formatINR(grandTotals.baseTax)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-400 font-semibold">{formatINR(grandTotals.cess)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-400 font-bold">{formatINR(grandTotals.totalDirectTax)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${getValueColor(grandTotals.netProfit)}`}>{formatINR(grandTotals.netProfit)}</TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${getValueColor(grandTotals.finalNetProfit)}`}>{formatINR(grandTotals.finalNetProfit)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="size-4" />Previous
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-8 text-xs" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next<ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Filter Controls ───────────────────────────────────

interface FilterControlsProps {
  uniquePairs: string[]
  availableFYs: number[]
  pairFilter: string
  fyFilter: string
  searchQuery: string
  sortBy: SortField
  sortOrder: SortOrder
  onPairChange: (val: string) => void
  onFyChange: (val: string) => void
  onSearchChange: (val: string) => void
  onSortChange: (val: SortField) => void
  onOrderChange: (val: SortOrder) => void
}

function FilterControls({
  uniquePairs, availableFYs, pairFilter, fyFilter, searchQuery,
  sortBy, sortOrder, onPairChange, onFyChange, onSearchChange, onSortChange, onOrderChange,
}: FilterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-auto sm:min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by pair, date, or profit..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50 pr-8"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>
      <Select value={fyFilter} onValueChange={onFyChange}>
        <SelectTrigger size="sm" className="w-[170px]"><SelectValue placeholder="All Financial Years" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Financial Years</SelectItem>
          {availableFYs.map((fy) => <SelectItem key={fy} value={String(fy)}>FY {fy}-{String(fy + 1).slice(2)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={pairFilter} onValueChange={onPairChange}>
        <SelectTrigger size="sm" className="w-[160px]"><SelectValue placeholder="All Pairs" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Pairs</SelectItem>
          {uniquePairs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortField)}>
        <SelectTrigger size="sm" className="w-[140px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="sellDate">Date</SelectItem>
          <SelectItem value="grossProfit">Gross Profit</SelectItem>
          <SelectItem value="netProfit">Net Profit</SelectItem>
          <SelectItem value="finalNetProfit">Final Profit</SelectItem>
          <SelectItem value="pair">Pair</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortOrder} onValueChange={(v) => onOrderChange(v as SortOrder)}>
        <SelectTrigger size="sm" className="w-[150px]"><SelectValue placeholder="Order" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">Descending</SelectItem>
          <SelectItem value="asc">Ascending</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
