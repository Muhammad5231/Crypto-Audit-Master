'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, Sunrise, Sunset, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function getGreeting(hour: number): { text: string; icon: React.ReactNode } {
  if (hour >= 5 && hour < 12) {
    return {
      text: 'Ready to review your crypto trades?',
      icon: <Sunrise className="h-4 w-4 text-amber-500" />,
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      text: "Here's your portfolio overview.",
      icon: <Sun className="h-4 w-4 text-orange-500" />,
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      text: 'Time to check your daily gains.',
      icon: <Sunset className="h-4 w-4 text-orange-600" />,
    };
  }
  return {
    text: 'Burning the midnight oil on crypto taxes?',
    icon: <Moon className="h-4 w-4 text-indigo-400" />,
  };
}

function getIndianFormattedDate(): string {
  const now = new Date();
  const day = now.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  return `${String(day).padStart(2, '0')} ${month} ${year}`;
}

export function WelcomeBanner() {
  const user = useAuthStore((s) => s.user);

  // Compute on every render (safe for server + client)
  const currentHour = new Date().getHours();
  const { text, icon } = getGreeting(currentHour);
  const formattedDate = getIndianFormattedDate();
  const displayName = user?.username || 'Trader';

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-teal-600/10 via-card to-orange-500/10 border-teal-500/20 dark:border-teal-400/15"
    >
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal-500/5 blur-2xl" />
        <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-orange-500/5 blur-2xl" />
      </div>

      <div className="relative px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Greeting content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            {/* Wave animation */}
            <motion.span
              className="text-2xl origin-bottom-right"
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{
                duration: 2.5,
                ease: 'easeInOut',
                times: [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1],
              }}
            >
              👋
            </motion.span>

            <h2 className="text-lg sm:text-xl font-bold text-foreground truncate">
              Welcome back,{' '}
              <span className="text-teal-600 dark:text-teal-400">{displayName}</span>
            </h2>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            {icon}
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        </div>

        {/* Date badge */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex items-center gap-2 rounded-xl bg-muted/60 border border-border/50 px-3 py-2 shrink-0"
        >
          <Sparkles className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-medium text-foreground whitespace-nowrap">
            {formattedDate}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
