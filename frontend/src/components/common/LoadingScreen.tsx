'use client';

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  className?: string;
}

export function LoadingScreen({ className = "" }: LoadingScreenProps) {
  const [displayText, setDisplayText] = useState("");
  const fullText = "Crypto Audit Master";

  // Typewriter effect for the app name
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 70);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-teal-800 ${className}`}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-teal-500/[0.08] blur-3xl -top-32 -left-32"
        animate={{ opacity: [0.08, 0.15, 0.08], scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-orange-400/[0.05] blur-3xl -bottom-24 -right-24"
        animate={{ opacity: [0.05, 0.1, 0.05], scale: [1, 1.1, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Shield icon with pulse + rotate */}
        <motion.div
          className="relative"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {/* Outer ring */}
          <motion.div
            className="absolute -inset-4 rounded-full border-2 border-teal-400/20"
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Inner ring */}
          <motion.div
            className="absolute -inset-2 rounded-full border border-teal-300/15"
            animate={{ scale: [1.05, 1, 1.05], opacity: [0.15, 0.35, 0.15] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          {/* Shield */}
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-600/20 backdrop-blur-sm border border-teal-400/30 shadow-lg shadow-teal-500/20"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Shield className="h-10 w-10 text-teal-300" />
          </motion.div>
        </motion.div>

        {/* App name with typewriter effect */}
        <div className="h-8 flex items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {displayText}
            <motion.span
              className="inline-block w-[2px] h-6 bg-teal-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "steps(2)",
              }}
            />
          </h1>
        </div>

        {/* Subtitle */}
        <motion.p
          className="text-sm text-teal-200/60 font-medium tracking-wide uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          Indian Crypto Spot Trade Audit
        </motion.p>

        {/* Loading bar */}
        <motion.div
          className="mt-4 h-1 w-48 rounded-full bg-white/10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-orange-400"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
