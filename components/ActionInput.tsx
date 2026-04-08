"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Stats } from "@/lib/game-engine";

interface ChoiceOption {
  id: number;
  text: string;
  stat_changes?: Partial<Stats>;
}

interface ActionInputProps {
  onAction: (action: string) => void;
  options?: ChoiceOption[];
  disabled?: boolean;
  currentEpisode?: number; // 当前集数，用于控制"我来做主"的显示
}

// 属性显示配置
const STAT_LABELS: Record<keyof Stats, string> = {
  favor: "宠爱",
  scheming: "心机",
  health: "健康",
  influence: "势力",
  silver: "银两",
  wisdom: "智慧",
  virtue: "德行",
  cruelty: "冷酷",
  san: "理智",
  freshness: "新鲜感",
  usefulness: "实用",
  dread: "忌惮",
  insight: "洞察",
  insight_gained: "洞察",
};

// 获取属性变化的中文描述
function getStatChangeText(key: keyof Stats, value: number): string {
  const label = STAT_LABELS[key] || key;
  
  // 对于正向变化
  if (value > 0) {
    switch (key) {
      case 'favor': return `宠爱提升`;
      case 'scheming': return `心机加深`;
      case 'influence': return `势力壮大`;
      case 'wisdom': return `智慧增长`;
      case 'virtue': return `德行积累`;
      case 'freshness': return `新鲜感增加`;
      case 'usefulness': return `实用价值提升`;
      case 'insight': return `洞察力增强`;
      case 'san': return `理智恢复`;
      case 'cruelty': return `手段变狠`;
      case 'dread': return `忌惮值上升`;
      case 'health': return `健康增加`;
      case 'silver': return `银两增加`;
      default: return `${label}+${value}`;
    }
  }
  
  // 对于负向变化
  if (value < 0) {
    switch (key) {
      case 'favor': return `宠爱降低`;
      case 'scheming': return `心机减弱`;
      case 'influence': return `势力削弱`;
      case 'wisdom': return `智慧受损`;
      case 'virtue': return `德行亏损`;
      case 'freshness': return `新鲜感消退`;
      case 'usefulness': return `实用价值下降`;
      case 'insight': return `洞察力消耗`;
      case 'san': return `理智消耗`;
      case 'cruelty': return `手段软化`;
      case 'dread': return `忌惮值下降`;
      case 'health': return `健康受损`;
      case 'silver': return `银两减少`;
      default: return `${label}${value}`;
    }
  }
  
  return '';
}

// 渲染单个属性的变化标签
function StatTag({ stat, value }: { stat: keyof Stats; value: number }) {
  if (value === 0) return null;
  
  const isPositive = value > 0;
  
  // 危险属性（忌惮、冷酷）- 增加是危险的
  const isDanger = stat === "dread" || stat === "cruelty";
  
  let bgColor = "rgba(100, 100, 100, 0.3)";
  let textColor = "var(--text-secondary)";
  let prefix = isPositive ? "↑" : "↓";
  
  // 特殊处理危险属性：正向增加是危险的
  if (isDanger && isPositive) {
    bgColor = "rgba(139, 0, 0, 0.5)";
    textColor = "#ff6b6b";
    prefix = "⚠";
  } else if (isDanger && !isPositive) {
    bgColor = "rgba(0, 100, 0, 0.4)";
    textColor = "#90EE90";
  } else if (isPositive) {
    bgColor = "rgba(184, 134, 11, 0.3)";
    textColor = "var(--palace-gold)";
  } else {
    bgColor = "rgba(100, 100, 100, 0.3)";
    textColor = "var(--text-secondary)";
  }
  
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1"
      style={{ background: bgColor, color: textColor }}
    >
      {prefix}{Math.abs(value)}
    </span>
  );
}

export const ActionInput: React.FC<ActionInputProps> = ({
  onAction,
  options = [],
  disabled = false,
  currentEpisode = 1,
}) => {
  const [mode, setMode] = useState<"options" | "input">("options");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 切换到输入模式时自动聚焦
  useEffect(() => {
    if (mode === "input" && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [mode]);

  const handleSend = () => {
    if (inputValue.trim() && !disabled) {
      onAction(inputValue.trim());
      setInputValue("");
    }
  };

  // 提取选项中的代价描述（括号内的内容）
  const extractCost = (text: string): { main: string; cost?: string } => {
    const match = text.match(/^(.*?)（(.+?)）$/);
    if (match) {
      return { main: match[1].trim(), cost: match[2].trim() };
    }
    // 也尝试圆括号
    const match2 = text.match(/^(.*?)\((.+?)\)$/);
    if (match2) {
      return { main: match2[1].trim(), cost: match2[2].trim() };
    }
    return { main: text, cost: undefined };
  };

  // 是否显示"我来做主"按钮（10集之后）
  const showCustomInput = currentEpisode > 10;

  return (
    <div className="space-y-3">
      {/* 模式切换 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("options")}
          className="text-xs px-4 py-2.5 min-h-[44px] rounded-full transition-all active:scale-95"
          style={{
            background: mode === "options" ? "rgba(139,37,0,0.3)" : "transparent",
            color: mode === "options" ? "var(--palace-gold)" : "var(--text-secondary)",
            border: `1px solid ${mode === "options" ? "var(--border-gold-bright)" : "var(--border-gold)"}`,
          }}
        >
          抉择选项
        </button>
        {showCustomInput && (
          <button
            onClick={() => setMode("input")}
            className="text-xs px-4 py-2.5 min-h-[44px] rounded-full transition-all active:scale-95"
            style={{
              background: mode === "input" ? "rgba(139,37,0,0.3)" : "transparent",
              color: mode === "input" ? "var(--palace-gold)" : "var(--text-secondary)",
              border: `1px solid ${mode === "input" ? "var(--border-gold-bright)" : "var(--border-gold)"}`,
            }}
          >
            我来做主
          </button>
        )}
      </div>

      {/* 选项模式 */}
      {mode === "options" && (
        <div className="space-y-3">
          {options.map((opt) => {
            const { main, cost } = extractCost(opt.text);
            const statChanges = opt.stat_changes;
            // 过滤出非零的属性变化
            const relevantChanges = statChanges 
              ? Object.entries(statChanges).filter(([, v]) => v !== 0) as [keyof Stats, number][]
              : [];
            
            // 生成属性得失的文字说明
            const statText = relevantChanges
              .map(([stat, value]) => getStatChangeText(stat, value))
              .filter(Boolean)
              .join('，');

            return (
              <button
                key={opt.id}
                onClick={() => !disabled && onAction(opt.text)}
                disabled={disabled}
                className="btn-choice w-full block text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start gap-2">
                  <span 
                    className="text-sm shrink-0 mt-0.5" 
                    style={{ color: "var(--palace-gold)", opacity: 0.7 }}
                  >
                    {opt.id}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed">{main}</div>
                    
                    {/* 代价描述 */}
                    {cost && (
                      <div className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)" }}>
                        （{cost}）
                      </div>
                    )}
                    
                    {/* 属性变化标签 */}
                    {relevantChanges.length > 0 && (
                      <div className="mt-2 flex flex-wrap">
                        {relevantChanges.map(([stat, value]) => (
                          <StatTag key={stat} stat={stat} value={value} />
                        ))}
                      </div>
                    )}
                    
                    {/* 属性得失的文字说明 */}
                    {statText && (
                      <div className="mt-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {statText}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 自由输入模式 */}
      {mode === "input" && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="我来做主，言心中所想..."
            disabled={disabled}
            className="input-palace flex-1 rounded min-h-[44px]"
            style={{ fontSize: "16px" }}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            enterKeyHint="send"
          />
          <button
            onClick={handleSend}
            disabled={disabled || !inputValue.trim()}
            className="btn-palace px-5 rounded min-h-[44px] min-w-[44px] active:scale-95"
          >
            呈
          </button>
        </div>
      )}
    </div>
  );
};
