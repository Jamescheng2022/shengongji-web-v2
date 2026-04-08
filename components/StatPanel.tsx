"use client";

import React from "react";
import type { Stats, Rank } from "@/lib/game-engine";
import { RANK_ORDER, getRankTitle } from "@/lib/game-engine";

interface StatPanelProps {
  stats: Stats;
  rank: Rank;
  episode: number;
}

// 只展示 4 个核心属性（产品设计要求简化）
const CORE_STATS = [
  { key: "favor" as const, label: "宠爱", icon: "❤️", color: "#E74C3C" },
  { key: "san" as const, label: "理智", icon: "🧠", color: "#9B59B6" },
  { key: "dread" as const, label: "忌惮", icon: "⚠️", color: "#C0392B" },
  { key: "insight" as const, label: "洞察", icon: "🔮", color: "#F39C12" },
];

const ALL_STATS = [
  ...CORE_STATS,
  { key: "health" as const, label: "健康", icon: "💚", color: "#27AE60" },
  { key: "influence" as const, label: "势力", icon: "👑", color: "#2980B9" },
  { key: "silver" as const, label: "银两", icon: "🪙", color: "#D4AF37" },
  { key: "scheming" as const, label: "心机", icon: "◆", color: "#9B59B6" },
  { key: "wisdom" as const, label: "智慧", icon: "✦", color: "#F39C12" },
  { key: "virtue" as const, label: "德行", icon: "☯", color: "#1ABC9C" },
  { key: "cruelty" as const, label: "狠毒", icon: "✕", color: "#C0392B" },
  // 设计文档新增三维帝王恩宠
  { key: "freshness" as const, label: "新鲜感", icon: "✨", color: "#E91E63" },
  { key: "usefulness" as const, label: "实用价值", icon: "💎", color: "#00BCD4" },
];

export const StatPanel: React.FC<StatPanelProps> = ({ stats, rank, episode }) => {
  const [expanded, setExpanded] = React.useState(false);
  const displayStats = expanded ? ALL_STATS : CORE_STATS;
  
  // 设计文档：理智警告和忌惮警告
  const sanWarning = stats.san <= 30;
  const dreadWarning = stats.dread >= 70;

  return (
    <div className="px-3 sm:px-4 md:px-8 py-3 sm:py-4" style={{ background: "var(--bg-card)" }}>
      <div className="max-w-2xl mx-auto">
        {/* 危机警告 */}
        {(sanWarning || dreadWarning) && (
          <div 
            className="mb-3 p-2 rounded text-xs text-center animate-pulse"
            style={{ 
              background: sanWarning ? "rgba(139,37,0,0.3)" : "rgba(192,57,43,0.3)",
              border: `1px solid ${sanWarning ? "#8B2500" : "#C0392B"}`,
              color: "#F5E6C8",
            }}
          >
            {sanWarning && "⚠️ 理智恍惚，你感到精神濒临崩溃..."}
            {sanWarning && dreadWarning && " | "}
            {dreadWarning && "⚠️ 帝王忌惮日深，危机四伏！"}
          </div>
        )}
        
        {/* 位份与集数 */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>位份：</span>
            <span className="text-sm sm:text-base font-semibold" style={{ color: "var(--palace-gold)" }}>
              {getRankTitle(rank)}
            </span>
          </div>
          <div className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
            存活 <span style={{ color: "var(--text-gold)" }}>{episode}</span> / 100 集
          </div>
        </div>

        {/* 位份进度 */}
        <div className="mb-3">
          <div className="flex gap-0.5 sm:gap-1">
            {RANK_ORDER.map((r, i) => (
              <div
                key={r}
                className="h-1 sm:h-1.5 flex-1 rounded-full transition-colors duration-500"
                title={r}
                style={{
                  background:
                    i <= RANK_ORDER.indexOf(rank)
                      ? "var(--palace-gold)"
                      : "rgba(212,175,55,0.15)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="divider-gold mb-3" />

        {/* 属性网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {displayStats.map((cfg) => {
            const val = stats[cfg.key];
            const barPct =
              cfg.key === "silver"
                ? Math.min(100, (val / 2000) * 100)
                : cfg.key === "virtue"
                ? ((val + 100) / 200) * 100
                : val;

            return (
              <div key={cfg.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span>{cfg.icon}</span> {cfg.label}
                  </span>
                  <span 
                    className="text-xs font-mono" 
                    style={{ 
                      color: cfg.key === "dread" && val >= 70 ? "#E74C3C" : "var(--text-primary)",
                    }}
                  >
                    {val}
                  </span>
                </div>
                <div
                  className="h-1 sm:h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, barPct))}%`,
                      background: cfg.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* 展开/收起 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs w-full text-center py-1 active:scale-95"
          style={{ color: "var(--text-secondary)", opacity: 0.6 }}
        >
          {expanded ? "收起 ↑" : "展开全部属性 ↓"}
        </button>
      </div>
    </div>
  );
};
