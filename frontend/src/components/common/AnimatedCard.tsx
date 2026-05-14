'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedCard({
  className,
  children,
  delay = 0,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: 'easeOut',
        delay,
      }}
      whileHover={{
        scale: 1.02,
        y: -2,
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
