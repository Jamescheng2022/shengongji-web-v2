"use client";

import React, { useState } from "react";

interface SubtextPanelProps {
  subtext: string;
  isRevealed: boolean;
  insight: number;
  onReveal: () => void;
}

export const SubtextPanel: React.FC<SubtextPanelProps> = ({
  subtext,
  isRevealed,
  insight,
  onReveal,
}) => {
  const [isRevealing, setIsRevealing] = useState(false);

  const handleReveal = () => {
    if (insight < 1 || isRevealed) return;
    setIsRevealing(true);
    setTimeout(() => {
      onReveal();
      setIsRevealing(false);
    }, 500);
  };

  return (
    <div className="mt-6 mb-4">
      <div className="divider-gold mb-4" />
      
      {isRevealed ? (
        // 已解锁：显示潜台词
        <div 
          className="relative p-4 rounded-lg animate-fade-in-up"
          style={{ 
            background: "linear-gradient(135deg, rgba(139,37,0,0.3) 0%, rgba(30,0,0,0.4) 100%)",
            border: "1px solid rgba(139,37,0,0.5)",
          }}
        >
          {/* 解锁标记 */}
          <div className="absolute -top-3 left-4 px-2 py-0.5 rounded text-xs" 
            style={{ 
              background: "rgba(139,37,0,0.9)",
              color: "var(--palace-gold)",
            }}>
            ✦ 潜台词已解锁
          </div>
          
          <div className="mt-2">
            <div className="text-xs mb-2 tracking-wider" style={{ color: "var(--text-secondary)" }}>
              言外之意
            </div>
            <p 
              className="text-sm leading-relaxed italic"
              style={{ 
                color: "#CD5C5C", // 暗红色
                textShadow: "0 0 10px rgba(139,37,0,0.3)",
              }}
            >
              "{subtext}"
            </p>
          </div>
        </div>
      ) : (
        // 未解锁：显示解码按钮
        <div 
          className="p-4 rounded-lg text-center"
          style={{ 
            background: "rgba(26,20,14,0.6)",
            border: "1px dashed var(--border-gold)",
          }}
        >
          <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            ⚠️ 话中有话，意味深长...
          </div>
          <button
            onClick={handleReveal}
            disabled={insight < 1 || isRevealing}
            className={`
              px-6 py-2.5 rounded-full text-sm font-medium transition-all
              ${insight >= 1 
                ? "cursor-pointer hover:scale-105 active:scale-95" 
                : "opacity-40 cursor-not-allowed"
              }
              ${isRevealing ? "animate-pulse" : ""}
            `}
            style={{
              background: insight >= 1 
                ? "linear-gradient(135deg, #8B2500 0%, #4a0000 100%)" 
                : "rgba(100,100,100,0.3)",
              border: "1px solid var(--palace-gold)",
              color: "var(--palace-gold)",
              boxShadow: insight >= 1 ? "0 0 15px rgba(139,37,0,0.4)" : "none",
            }}
          >
            🔮 消耗1点洞察力 · 解码潜台词
            <span className="ml-2 opacity-60">({insight}点可用)</span>
          </button>
          {insight < 1 && (
            <div className="text-xs mt-2" style={{ color: "#E74C3C" }}>
              洞察力不足，无法解码
            </div>
          )}
        </div>
      )}
    </div>
  );
};
