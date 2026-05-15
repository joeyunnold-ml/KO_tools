"use client";

import { motion } from "motion/react";

export default function ParticipantAnalyze() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-grey-100">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-[64px]"
      >
        🤖
      </motion.div>
      <p className="mt-5 text-[12px] font-medium uppercase tracking-[2px] text-grey-700">
        Analyzing
      </p>
      <h1 className="mt-2 text-[22px] font-medium text-foreground max-w-xs">
        Looking for consensus and conflict…
      </h1>
    </main>
  );
}
