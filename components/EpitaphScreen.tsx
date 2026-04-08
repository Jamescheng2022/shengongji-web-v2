"use client";

import React, { useState, useEffect } from "react";
import { useGameStore } from "@/lib/store";

interface EpitaphData {
  epitaph: string;
  epitaph_interpretation: string;
  biography: string;
  biography_poem: string;
  verdict: string;
}

interface EpitaphScreenProps {
  onClose: () => void;
}

export default function EpitaphScreen({ onClose }: EpitaphScreenProps) {
  const gameState = useGameStore((s) => s.gameState);
  const [epitaph, setEpitaph] = useState<EpitaphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    generateEpitaph();
  }, []);

  const generateEpitaph = async () => {
    if (!gameState) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/epitaph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: gameState.playerProfile.fullName,
          surname: gameState.playerProfile.surname,
          endingType: gameState.ending || 'death_poison',
          endingTitle: getEndingTitle(gameState.ending || 'death_poison'),
          episodes: gameState.currentEpisode,
          finalRank: gameState.rank,
          stats: {
            san: gameState.stats.san,
            cruelty: gameState.stats.cruelty,
            freshness: gameState.stats.freshness,
            usefulness: gameState.stats.usefulness,
            dread: gameState.stats.dread,
          },
          history: gameState.history,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate epitaph');

      const data = await response.json();
      setEpitaph(data);
    } catch (err) {
      console.error('[EpitaphScreen] Error:', err);
      setError('墓志铭生成失败');
    } finally {
      setLoading(false);
    }
  };

  const getEndingTitle = (ending: string): string => {
    const titles: Record<string, string> = {
      death_poison: '鸩酒之殇',
      death_illness: '红颜薄命',
      cold_palace: '冷宫幽怨',
      exile: '天涯孤客',
      suicide: '玉碎昆冈',
      become_nun: '青灯古佛',
      queen: '母仪天下',
      peaceful: '岁月静好',
    };
    return titles[ending] || '魂归离恨';
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 sm:py-12 text-center safe-top safe-bottom animate-fade-in">
      {/* 标题 */}
      <div className="mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm tracking-[0.3em] sm:tracking-[0.5em] mb-2" style={{ color: "var(--text-secondary)" }}>
          — 墓 志 铭 —
        </p>
        <h2 
          className="text-xl sm:text-2xl font-bold tracking-wider"
          style={{ color: "var(--palace-gold)" }}
        >
          {gameState?.playerProfile.fullName}
        </h2>
        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          {gameState?.playerProfile.surname}氏 · {getEndingTitle(gameState?.ending || '')}
        </p>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--palace-gold)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            史官正在撰写墓志铭...
          </p>
        </div>
      )}

      {/* 墓志铭内容 */}
      {!loading && epitaph && (
        <div className="w-full max-w-lg animate-fade-in-up">
          {/* 墓志铭 */}
          <div className="mb-8 sm:mb-10">
            <div 
              className="relative p-6 sm:p-8 mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.15) 0%, rgba(101, 67, 33, 0.1) 100%)',
                border: '1px solid var(--border-gold)',
                borderRadius: '4px',
              }}
            >
              {/* 装饰角 */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2" style={{ borderColor: "var(--palace-gold)" }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2" style={{ borderColor: "var(--palace-gold)" }} />
              
              <p 
                className="text-lg sm:text-xl leading-relaxed font-serif"
                style={{ color: "var(--text-gold)" }}
              >
                「{epitaph.epitaph}」
              </p>
            </div>
            
            {/* 白话解读 */}
            <p 
              className="text-xs italic"
              style={{ color: "var(--text-secondary)" }}
            >
              {epitaph.epitaph_interpretation}
            </p>
          </div>

          {/* 本纪（点击展开） */}
          <div className="mb-8">
            <button
              onClick={() => setShowFull(!showFull)}
              className="w-full flex items-center justify-between px-4 py-3 mb-3 transition-colors"
              style={{
                background: showFull ? 'rgba(139, 69, 19, 0.2)' : 'rgba(139, 69, 19, 0.1)',
                border: '1px solid var(--border-gold)',
                borderRadius: '4px',
              }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--palace-gold)" }}>
                📜 本纪 · 史官评传
              </span>
              <span style={{ color: "var(--palace-gold)" }}>
                {showFull ? '▲' : '▼'}
              </span>
            </button>

            {showFull && (
              <div 
                className="p-4 sm:p-6 text-left animate-fade-in"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '4px',
                }}
              >
                {/* 评传正文 */}
                <p 
                  className="text-sm sm:text-base leading-loose mb-4 font-serif"
                  style={{ color: "var(--text-primary)" }}
                >
                  {epitaph.biography}
                </p>

                {/* 引用诗句 */}
                <div className="border-t border-b py-3 my-4" style={{ borderColor: "var(--border-gold)" }}>
                  <p 
                    className="text-center text-sm italic"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {epitaph.biography_poem}
                  </p>
                </div>

                {/* 史官评语 */}
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                    —— 史官评语 ——
                  </p>
                  <p 
                    className="text-sm font-medium"
                    style={{ color: "var(--palace-gold)" }}
                  >
                    {epitaph.verdict}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 统计数据 */}
          <div 
            className="flex justify-center gap-6 text-xs mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            <div>
              <span className="font-bold" style={{ color: "var(--text-gold)" }}>{gameState?.currentEpisode}</span>
              集
            </div>
            <div>·</div>
            <div>
              <span className="font-bold" style={{ color: "var(--text-gold)" }}>{gameState?.rank}</span>
            </div>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <div className="text-center mb-8">
          <p className="text-sm" style={{ color: "#c53030" }}>{error}</p>
          <button
            onClick={generateEpitaph}
            className="mt-3 text-sm underline"
            style={{ color: "var(--palace-gold)" }}
          >
            重新生成
          </button>
        </div>
      )}

      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="mt-4 px-8 py-3 text-sm transition-all active:scale-95"
        style={{
          background: 'rgba(139, 69, 19, 0.3)',
          border: '1px solid var(--palace-gold)',
          borderRadius: '4px',
          color: "var(--palace-gold)",
        }}
      >
        关闭
      </button>

      {/* 背景装饰 */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, var(--palace-gold) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );
}
