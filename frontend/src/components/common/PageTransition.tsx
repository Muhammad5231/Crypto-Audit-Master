'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  className?: string;
  children: React.ReactNode;
}

export function PageTransition({ className, children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
