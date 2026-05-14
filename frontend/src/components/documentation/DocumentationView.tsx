'use client';

import { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  ChevronRight,
  AlertTriangle,
  Calculator,
  FileText,
  HelpCircle,
  Landmark,
  Receipt,
  Wallet,
  TrendingUp,
  Layers,
  Percent,
  ShieldAlert,
  Upload,
  Table,
  Rocket,
  Lightbulb,
  ThumbsUp,
  ArrowRight,
  FileSpreadsheet,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAppStore } from '@/store/appStore';

interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  category: 'basics' | 'fees' | 'tax' | 'technical';
  related?: string[];
}

const sections: DocSection[] = [
  {
    id: 'fifo',
    title: 'What is FIFO?',
    icon: Layers,
    category: 'basics',
    content:
      'First In, First Out is a trade matching method where the oldest buy is matched against a sell first. This is the standard method for calculating crypto capital gains in India. When you sell, the system picks the earliest purchase to calculate gains, ensuring a consistent and tax-compliant approach.',
    related: ['open-holdings', 'crypto-tax', 'net-profit'],
  },
  {
    id: 'csv-upload',
    title: 'How CSV Upload Works',
    icon: Upload,
    category: 'technical',
    content:
      'Upload exchange CSV files from platforms like Binance, CoinDCX, WazirX, etc. The system parses trades, detects duplicate files using SHA-256 hashing, and merges all trades from multiple files. Supported formats include common exchange exports with automatic column alias detection.',
    related: ['csv-format'],
  },
  {
    id: 'fee-calculation',
    title: 'Fee Calculation',
    icon: Receipt,
    category: 'fees',
    content:
      'Exchange fees are calculated based on your configured fee percentages. Buy Fee = Buy Value × Buy Fee%, Sell Fee = Sell Value × Sell Fee%. You can configure these percentages in Exchange Settings for each workspace.',
    related: ['gst', 'net-profit'],
  },
  {
    id: 'gst',
    title: 'GST on Fees',
    icon: Percent,
    category: 'fees',
    content:
      '18% GST is applied on total exchange fees (buy + sell fees combined). This is calculated automatically based on the fee percentages you configure. The GST amount is added to your total cost.',
    related: ['fee-calculation', 'net-profit'],
  },
  {
    id: 'tds',
    title: 'TDS (Tax Deducted at Source)',
    icon: Landmark,
    category: 'tax',
    content:
      '1% TDS is deducted on sell value. This is withheld by the exchange. It\'s shown separately because it\'s a credit against your final tax liability. TDS is already deducted by exchanges like Binance, CoinDCX, etc., so you get a credit for it when filing taxes.',
    related: ['crypto-tax', 'net-profit'],
  },
  {
    id: 'crypto-tax',
    title: '30% Crypto Tax',
    icon: Calculator,
    category: 'tax',
    content:
      'As per Indian tax law (Section 115BBH), income from Virtual Digital Assets (VDA) including cryptocurrency is taxed at a flat 30% on realized gains. This applies to both short-term and long-term crypto gains — there is no distinction in India.',
    related: ['cess', 'tds', 'net-profit'],
  },
  {
    id: 'cess',
    title: 'Health & Education Cess',
    icon: TrendingUp,
    category: 'tax',
    content:
      '4% cess is levied on the base crypto tax, making the effective rate 31.2%. The calculation is: Total Tax = 30% × Gains + 4% × (30% × Gains). This cess is automatically calculated and included in your tax summary.',
    related: ['crypto-tax', 'net-profit'],
  },
  {
    id: 'open-holdings',
    title: 'Open Holdings',
    icon: Wallet,
    category: 'basics',
    content:
      'Open holdings are unmatched buy positions remaining after FIFO matching. These represent crypto you still hold and haven\'t sold yet. The average buy price is calculated as the weighted average of all unmatched buy lots.',
    related: ['fifo'],
  },
  {
    id: 'net-profit',
    title: 'Final Net Profit',
    icon: Calculator,
    category: 'tax',
    content:
      'Final Net Profit = Gross Profit − Total Fees − GST − TDS − Total Direct Tax + TDS (credit). The TDS is added back as it\'s a tax credit. This gives you the actual amount of tax you owe after accounting for all deductions.',
    related: ['crypto-tax', 'cess', 'tds', 'fee-calculation'],
  },
  {
    id: 'csv-format',
    title: 'Required CSV Format',
    icon: FileSpreadsheet,
    category: 'technical',
    content:
      'Your CSV file must contain 6 columns: Time, Contract (pair), Qty, Side (BUY/SELL), Exec.Price, and Fees. The system supports many aliases for each column name. Check the CSV Format tab for the full list of accepted aliases.',
    related: ['csv-upload'],
  },
];

const columnAliases = [
  { columnName: 'Time', aliases: ['Date', 'Timestamp', 'time', 'date', 'Executed At', 'created_at'] },
  { columnName: 'Contract', aliases: ['Pair', 'Symbol', 'Market', 'Instrument', 'contract', 'pair'] },
  { columnName: 'Qty', aliases: ['Quantity', 'Amount', 'Size', 'Volume', 'qty', 'quantity', 'amount'] },
  { columnName: 'Side', aliases: ['Type', 'Action', 'Direction', 'side', 'type', 'action'] },
  { columnName: 'Exec.Price', aliases: ['Price', 'Avg Price', 'Fill Price', 'Rate', 'price', 'avg_price'] },
  { columnName: 'Fees', aliases: ['Fee', 'Commission', 'Trading Fee', 'fee', 'commission', 'trading_fee'] },
];

export function DocumentationView() {
  const [searchQuery, setSearchQuery] = useState('');
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const taxRef = useRef<HTMLDivElement>(null);
  const fifoRef = useRef<HTMLDivElement>(null);
  const csvRef = useRef<HTMLDivElement>(null);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleQuickLink = (action: string) => {
    if (action === 'upload') {
      setCurrentView('upload');
      return;
    }
    // Scroll to section after a tick (tabs may need switching)
    setTimeout(() => {
      if (action === 'tax' && taxRef.current) {
        taxRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'fifo' && fifoRef.current) {
        fifoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action === 'csv' && csvRef.current) {
        csvRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Documentation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learn about FIFO matching, tax calculations, and how to use Crypto
          Audit Master.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Getting Started', desc: 'Upload your first CSV', icon: Rocket, action: 'upload', color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
          { label: 'Tax Guide', desc: 'Indian VDA tax rules', icon: Landmark, action: 'tax', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
          { label: 'FIFO Explained', desc: 'Matching methodology', icon: Layers, action: 'fifo', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
          { label: 'CSV Format', desc: 'Required columns', icon: FileSpreadsheet, action: 'csv', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleQuickLink(item.action)}
            className="flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:shadow-md hover:border-muted-foreground/30 cursor-pointer group"
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground mt-0.5 shrink-0 transition-colors" />
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 rounded-xl bg-muted/50 border-border/50"
        />
      </div>

      {/* Tabs for categorized content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
          <TabsTrigger value="all" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            All Topics
          </TabsTrigger>
          <TabsTrigger value="basics" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Basics
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Fees & GST
          </TabsTrigger>
          <TabsTrigger value="tax" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Tax
          </TabsTrigger>
          <TabsTrigger value="technical" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Technical
          </TabsTrigger>
          <TabsTrigger value="csv" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
            CSV Format
          </TabsTrigger>
        </TabsList>

        {/* All Topics */}
        <TabsContent value="all" className="space-y-3 mt-4">
          <SectionList sections={searchQuery.trim() ? filteredSections : sections} searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="basics" className="space-y-3 mt-4">
          <SectionList
            sections={filteredSections.filter((s) => s.category === 'basics')}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="fees" className="space-y-3 mt-4">
          <SectionList
            sections={filteredSections.filter((s) => s.category === 'fees')}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="tax" className="space-y-3 mt-4" ref={taxRef}>
          <SectionList
            sections={filteredSections.filter((s) => s.category === 'tax')}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="technical" className="space-y-3 mt-4" ref={fifoRef}>
          <SectionList
            sections={filteredSections.filter((s) => s.category === 'technical')}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="csv" className="space-y-4 mt-4" ref={csvRef}>
          {/* Sample CSV Format */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                  <Table className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                </div>
                Sample CSV Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your exchange CSV file should contain these columns. The system
                will automatically detect column names using supported aliases.
              </p>
              <div className="rounded-xl border bg-muted/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b">
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Time
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Contract
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Qty
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Side
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Exec.Price
                        </th>
                        <th className="px-4 py-2.5 text-left font-mono text-xs font-semibold text-foreground">
                          Fees
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          2024-01-15 10:30:00
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          BTCUSDT
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          0.5
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-normal border-0">
                            BUY
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          42000.50
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          4.20
                        </td>
                      </tr>
                      <tr className="border-b last:border-0">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          2024-02-20 14:15:00
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          BTCUSDT
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          0.3
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-normal border-0">
                            SELL
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                          44500.00
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                          3.50
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supported Column Aliases */}
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                Supported Column Aliases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                The system automatically maps common column names to the
                required fields. If your CSV uses different names, try renaming
                them to one of these supported aliases.
              </p>
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                          Required Column
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                          Accepted Aliases
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {columnAliases.map((col) => (
                        <tr
                          key={col.columnName}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20"
                            >
                              {col.columnName}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {col.aliases.map((alias) => (
                                <span
                                  key={alias}
                                  className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                                >
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-950/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Disclaimer
                  </h3>
                  <p className="text-sm text-amber-700/90 dark:text-amber-400/80 leading-relaxed">
                    This tool is for operational review and audit visibility only.
                    It does not replace professional tax advice. Please consult a
                    qualified Chartered Accountant for your tax filings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Questions */}
      <Separator />
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-orange-500" />
          Related Questions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { label: 'How is FIFO different from LIFO?', icon: HelpCircle },
            { label: 'Can I use this for futures trading?', icon: HelpCircle },
            { label: 'How do I handle airdrops?', icon: HelpCircle },
            { label: 'What about crypto-to-crypto trades?', icon: HelpCircle },
          ].map((q) => (
            <div
              key={q.label}
              className="flex items-center gap-3 rounded-xl border p-3 text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 transition-colors"
            >
              <q.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{q.label}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Section List Sub-component ──────────────────────────── */

function SectionList({
  sections,
  searchQuery,
}: {
  sections: DocSection[];
  searchQuery: string;
}) {
  if (sections.length === 0 && searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          No topics matching &quot;{searchQuery}&quot;
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {sections.map((section) => (
        <SectionAccordionItem key={section.id} section={section} />
      ))}
    </Accordion>
  );
}

function SectionAccordionItem({ section }: { section: DocSection }) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const Icon = section.icon;
  const categoryColors: Record<string, string> = {
    basics: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    fees: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    tax: 'bg-red-500/10 text-red-600 dark:text-red-400',
    technical: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };

  const categoryLabels: Record<string, string> = {
    basics: 'Basics',
    fees: 'Fees',
    tax: 'Tax',
    technical: 'Technical',
  };

  // Related sections
  const relatedSections = (section.related || [])
    .map((rid) => sections.find((s) => s.id === rid))
    .filter(Boolean) as DocSection[] | [];

  return (
    <AccordionItem
      value={section.id}
      className="rounded-2xl border px-1 data-[state=open]:shadow-sm transition-all"
    >
      <AccordionTrigger className="px-3 py-4 hover:no-underline rounded-xl">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${categoryColors[section.category]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {section.title}
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] font-normal uppercase tracking-wider"
              >
                {categoryLabels[section.category]}
              </Badge>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-4">
        <div className="pl-[52px] space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {section.content}
          </p>

          {/* Was this helpful? */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">Was this helpful?</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-500/10"
              onClick={() => setFeedbackGiven(true)}
              disabled={feedbackGiven}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {feedbackGiven ? 'Thanks!' : 'Yes'}
            </Button>
          </div>

          {/* Related questions */}
          {relatedSections.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" />
                Related Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {relatedSections.map((rs) => {
                  const RsIcon = rs.icon;
                  return (
                    <Badge
                      key={rs.id}
                      variant="outline"
                      className="text-xs font-normal gap-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <RsIcon className="h-3 w-3" />
                      {rs.title}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
