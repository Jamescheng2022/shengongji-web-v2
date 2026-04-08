"use client";

import React, { useState } from "react";
import { useGameStore } from "@/lib/store";
import type { EndingType } from "@/lib/game-engine";
import PosterGenerator from "./PosterGenerator";
import ShareButton from "./ShareButton";
import EpitaphScreen from "./EpitaphScreen";

// 设计文档增强：更多结局类型
type EnhancedEndingType = NonNullable<EndingType>;

const ENDING_INFO: Record<EnhancedEndingType, { 
  title: string; 
  desc: string; 
  isHappy: boolean;
  type: 'victory' | 'death' | 'neutral';
  quote?: string; // 经典评语
}> = {
  queen: {
    title: "母仪天下",
    desc: "历经百集风雨，沈知意终于登上皇后之位。从一个汉军旗秀女，到母仪天下的一国之母，这条路上的每一步，都浸透了智慧与坚韧。",
    isHappy: true,
    type: 'victory',
    quote: "存活即胜利，但这胜利的代价，是你自己。",
  },
  peaceful: {
    title: "岁月静好",
    desc: "沈知意在后宫中安然度过了百集光阴。虽未登上皇后之位，却以自己的方式在这深宫中觅得了一方清净。善终，已是最好的结局。",
    isHappy: true,
    type: 'neutral',
  },
  // 设计文档：帝王忌惮值满
  death_poison: {
    title: "鸩酒之殇",
    desc: "帝王忌惮日深，一杯鸩酒，终结了所有挣扎。权力的游戏没有怜悯，败者的下场，不过是一抹被抹去的痕迹。",
    isHappy: false,
    type: 'death',
    quote: "当你凝视深渊时，深渊早已将你吞噬。",
  },
  // 健康归零
  death_illness: {
    title: "红颜薄命",
    desc: "深宫的阴冷与算计终于压垮了你。在一个无人问津的夜晚，你在自己的寝殿中悄然离世，如同一朵无声凋零的花。",
    isHappy: false,
    type: 'death',
    quote: "木秀于林，风必摧之。",
  },
  // 宠爱归零
  cold_palace: {
    title: "冷宫幽怨",
    desc: "失去了所有恩宠与势力，你被打入冷宫。残垣断壁间，只有岁月无情地流逝。曾经的繁华如梦，再无人记得你的名字。",
    isHappy: false,
    type: 'death',
    quote: "一入宫门深似海，从此萧郎是路人。",
  },
  exile: {
    title: "天涯孤客",
    desc: "一纸诏书，你被逐出京城，流放边疆。紫禁城的红墙在身后越来越远，你知道，此生再无归路。",
    isHappy: false,
    type: 'death',
    quote: "最是无情帝王家。",
  },
  // 设计文档：理智归零
  suicide: {
    title: "玉碎昆冈",
    desc: "理智崩塌，在绝望中选择最后的尊严。白绫三尺，了却了这一生的恩怨情仇。你终于自由了。",
    isHappy: false,
    type: 'death',
    quote: "当你凝视深渊时，深渊将回以凝视。",
  },
  become_nun: {
    title: "青灯古佛",
    desc: "看透了后宫的虚妄，你遁入空门。晨钟暮鼓中，曾经的爱恨嗔痴化作一缕青烟，随风散去。这或许不是最好的结局，却是最通透的选择。",
    isHappy: false,
    type: 'neutral',
    quote: "看破红尘，不过如此。",
  },
};

export default function EndingScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const [showPoster, setShowPoster] = useState(false);
  const [showEpitaph, setShowEpitaph] = useState(false);

  if (!gameState?.ending) {
    return null;
  }

  const info = ENDING_INFO[gameState.ending];

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-8 sm:py-12 text-center safe-top safe-bottom">
      {/* 海报生成层 */}
      {showPoster && (
        <PosterGenerator gameState={gameState} onClose={() => setShowPoster(false)} />
      )}

      {/* 墓志铭层 */}
      {showEpitaph && (
        <EpitaphScreen onClose={() => setShowEpitaph(false)} />
      )}

      {/* 结局类型标签 */}
      <p
        className="text-xs sm:text-sm tracking-[0.3em] sm:tracking-[0.5em] mb-4 sm:mb-6"
        style={{ color: info.type === 'victory' ? "var(--palace-gold)" : "var(--text-secondary)" }}
      >
        {info.type === 'victory' ? "— 善 终 —" : info.type === 'death' ? "— 魂 归 —" : "— 终 局 —"}
      </p>

      {/* 标题 */}
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-black tracking-widest mb-6 sm:mb-8 animate-fade-in-up"
        style={{ 
          color: info.type === 'victory' 
            ? "var(--palace-gold)" 
            : info.type === 'death' 
              ? "#8B0000" 
              : "var(--palace-red-light)" 
        }}
      >
        {info.title}
      </h1>

      {/* 描述 */}
      <p
        className="max-w-md text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 animate-fade-in-up"
        style={{ color: "var(--text-primary)", animationDelay: "0.3s" }}
      >
        {info.desc}
      </p>

      {/* 经典评语 */}
      {info.quote && (
        <p
          className="max-w-md text-xs sm:text-sm italic leading-relaxed mb-6 sm:mb-8 animate-fade-in-up"
          style={{ color: "var(--text-secondary)", opacity: 0.8, animationDelay: "0.4s" }}
        >
          " {info.quote} "
        </p>
      )}

      {/* 统计 */}
      <div
        className="flex gap-6 sm:gap-8 mb-8 sm:mb-12 text-xs sm:text-sm animate-fade-in-up"
        style={{ color: "var(--text-secondary)", animationDelay: "0.6s" }}
      >
        <div>
          <div className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-gold)" }}>
            {gameState.currentEpisode}
          </div>
          <div>存活集数</div>
        </div>
        <div className="w-px" style={{ background: "var(--border-gold)" }} />
        <div>
          <div className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-gold)" }}>
            {gameState.rank}
          </div>
          <div>最终位份</div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-20 sm:w-24 divider-gold mb-8 sm:mb-10" />

      {/* 操作 */}
      <div className="flex flex-col gap-3 w-full max-w-xs animate-fade-in-up" style={{ animationDelay: "0.9s" }}>
        {/* 墓志铭按钮 - 死亡/悲剧结局显示 */}
        {(info.type === 'death' || info.type === 'neutral') && (
          <button 
            onClick={() => setShowEpitaph(true)}
            className="btn-palace min-h-[44px] active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.3) 0%, rgba(101, 67, 33, 0.2) 100%)',
              border: '1px solid rgba(139, 0, 0, 0.5)',
            }}
          >
            <span className="mr-2">📜</span>
            查看墓志铭 · 本纪
          </button>
        )}

        {/* 胜利结局显示"青史留名" */}
        {info.type === 'victory' && (
          <button 
            onClick={() => setShowEpitaph(true)}
            className="btn-palace min-h-[44px] active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(184, 134, 11, 0.3) 0%, rgba(101, 67, 33, 0.2) 100%)',
              border: '1px solid var(--palace-gold)',
            }}
          >
            <span className="mr-2">👑</span>
            查看本纪 · 功过千秋
          </button>
        )}

        <ShareButton 
          gameState={gameState} 
          onGeneratePoster={() => setShowPoster(true)} 
          className="mb-3 sm:mb-4"
        />
        <button onClick={() => setScreen("character-setup")} className="btn-palace bg-white/5 border-white/20 text-white min-h-[44px] active:scale-95">
          重新开始
        </button>
        <button onClick={() => setScreen("home")} className="btn-palace bg-white/5 border-white/20 text-white min-h-[44px] active:scale-95">
          返回首页
        </button>
      </div>
    </div>
  );
}
