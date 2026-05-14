"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  BadgePercent,
  Receipt,
  Calculator,
  ArrowRightLeft,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TaxTip {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const TAX_TIPS: TaxTip[] = [
  {
    text: "30% flat tax on crypto gains (no slab benefit)",
    icon: Calculator,
    category: "Income Tax",
  },
  {
    text: "1% TDS deducted on crypto transfers above ₹10,000",
    icon: BadgePercent,
    category: "TDS",
  },
  {
    text: "4% Health & Education Cess on base tax",
    icon: Receipt,
    category: "Cess",
  },
  {
    text: "18% GST on exchange trading fees",
    icon: Landmark,
    category: "GST",
  },
  {
    text: "FIFO method used for matching trades",
    icon: ArrowRightLeft,
    category: "Method",
  },
  {
    text: "Losses cannot be carried forward for crypto",
    icon: TrendingDown,
    category: "Losses",
  },
];

const ROTATION_INTERVAL = 5000;

export function TaxInfoWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToTip = useCallback(
    (newIndex: number) => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentIndex(newIndex);
        setIsFading(false);
      }, 250);
    },
    []
  );

  const goNext = useCallback(() => {
    goToTip((currentIndex + 1) % TAX_TIPS.length);
  }, [currentIndex, goToTip]);

  const goPrev = useCallback(() => {
    goToTip((currentIndex - 1 + TAX_TIPS.length) % TAX_TIPS.length);
  }, [currentIndex, goToTip]);

  // Auto-rotate
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(goNext, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, goNext]);

  const currentTip = TAX_TIPS[currentIndex];
  const Icon = currentTip.icon;

  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10">
              <Landmark className="h-3.5 w-3.5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                India VDA Tax Rules
              </p>
              <p className="text-[10px] text-muted-foreground">
                {currentIndex + 1} of {TAX_TIPS.length} tips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="h-7 w-7 rounded-lg"
              aria-label="Previous tip"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="h-7 w-7 rounded-lg"
              aria-label="Next tip"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tip content with fade animation */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={cn(
              "flex items-start gap-3 transition-opacity duration-250",
              isFading ? "opacity-0" : "opacity-100"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-orange-500/10 mt-0.5">
              <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {currentTip.text}
              </p>
              <span className="inline-flex mt-1.5 text-[10px] font-medium text-teal-600 dark:text-teal-400 bg-teal-500/10 rounded-md px-1.5 py-0.5">
                {currentTip.category}
              </span>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TAX_TIPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToTip(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentIndex
                  ? "w-4 bg-teal-500"
                  : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
              )}
              aria-label={`Go to tip ${idx + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
