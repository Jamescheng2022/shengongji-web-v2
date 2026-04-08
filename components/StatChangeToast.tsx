"use client";

import React from "react";
import type { Stats } from "@/lib/game-engine";

const STAT_LABELS: Record<string, string> = {
  favor: "宠爱",
  scheming: "心机",
  health: "健康",
  influence: "势力",
  silver: "银两",
  wisdom: "智慧",
  virtue: "德行",
  cruelty: "狠毒",
  // 设计文档新增
  san: "理智",
  freshness: "新鲜感",
  usefulness: "实用价值",
  dread: "忌惮",
  insight: "洞察",
};

interface StatChangeToastProps {
  changes: Partial<Stats>;
}

export default function StatChangeToast({ changes }: StatChangeToastProps) {
  const entries = Object.entries(changes).filter(([, v]) => v !== 0 && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="stat-float px-4 py-2 rounded text-sm font-semibold"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-gold)",
            color: (val as number) > 0 ? "#27AE60" : "#E74C3C",
          }}
        >
          {STAT_LABELS[key] || key} {(val as number) > 0 ? "+" : ""}
          {val}
        </div>
      ))}
    </div>
  );
}
