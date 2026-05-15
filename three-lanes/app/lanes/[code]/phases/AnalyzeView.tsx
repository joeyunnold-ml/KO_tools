"use client";

import { motion } from "motion/react";

export default function AnalyzeView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-[80px]"
      >
        🤖
      </motion.div>
      <p className="mt-6 text-[13px] font-medium uppercase tracking-[2px] text-grey-700">
        Analyzing
      </p>
      <h1 className="mt-2 text-[28px] font-medium text-foreground">
        Looking for consensus and conflict…
      </h1>
      <p className="mt-3 text-[14px] text-grey-700 max-w-md">
        Reading the classifications. We&apos;ll show consensus items first, then walk through the contested ones one at a time.
      </p>
      <div className="mt-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-deep-blue-800"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
