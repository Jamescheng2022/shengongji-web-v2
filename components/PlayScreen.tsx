"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useGameStore } from "@/lib/store";
import { getRankTitle, RANK_ORDER, AVATAR_OPTIONS, type AIResponse, type GameState } from "@/lib/game-engine";
import { getOpeningNarration, OPENING_CHOICES } from "@/lib/prompts";
import { StoryViewer } from "./StoryViewer";
import { StatPanel } from "./StatPanel";
import { ActionInput } from "./ActionInput";
import StatChangeToast from "./StatChangeToast";
import { SubtextPanel } from "./SubtextPanel";

export default function PlayScreen() {
  const {
    gameState,
    isLoading,
    currentChoices,
    streamingText,
    statChanges,
    setScreen,
    addPlayerAction,
    setStreamingText,
    applyAIResponse,
    setLoading,
    setChoices,
    setStatChanges,
    setLastNarration,
    recordChapter,
    autoSave,
    // 潜台词系统
    pendingSubtext,
    isSubtextRevealed,
    revealSubtext,
  } = useGameStore();

  const [showStats, setShowStats] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const pendingChoicesRef = useRef<{ id: number; text: string }[]>([]);

  // 预生成加速：后台调用预取接口
  const triggerPrefetch = useCallback(async (state: GameState, options: string[]) => {
    if (!state || !options.length) return;
    try {
      fetch("/api/prefetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameState: state, options }),
      }).catch(() => {}); // 静默忽略失败
    } catch (e) {
      // 捕获可能抛出的异常，静默处理
    }
  }, []);

  // 初始化：显示开场白
  useEffect(() => {
    if (!gameState || hasInitialized.current) return;
    hasInitialized.current = true;

    if (gameState.history.length === 0 && gameState.chapters.length === 0) {
      // 新游戏：展示开场（使用玩家角色名）
      const p = gameState.playerProfile;
      const narration = getOpeningNarration(p.fullName, p.surname);
      setDisplayText(narration);
      setLastNarration(narration);
      setChoices(OPENING_CHOICES);
      pendingChoicesRef.current = OPENING_CHOICES;
      // 预生成加速：并行预取开场选项
      triggerPrefetch(gameState, OPENING_CHOICES.map(c => c.text));
    } else if (gameState.pendingNarration) {
      // 读档/改命：优先恢复当前待选择剧情点
      setDisplayText(gameState.pendingNarration);
      setLastNarration(gameState.pendingNarration);
      setChoices(gameState.pendingChoices || []);
      pendingChoicesRef.current = gameState.pendingChoices || [];
      // 预生成加速：并行预取待选选项
      if (gameState.pendingChoices?.length) {
        triggerPrefetch(gameState, gameState.pendingChoices.map((c: { text: string }) => c.text));
      }
    } else {
      // 读档：展示最后一条narrator消息
      const lastNarrator = [...gameState.history].reverse().find((h) => h.role === "narrator");
      if (lastNarrator) {
        setDisplayText(lastNarrator.content);
        setLastNarration(lastNarrator.content);
      }
      const lastChapterChoices = gameState.chapters.length > 0
        ? gameState.chapters[gameState.chapters.length - 1].availableChoices
        : [];
      setChoices(lastChapterChoices);
      pendingChoicesRef.current = lastChapterChoices;
    }
  }, [gameState, setChoices, setLastNarration]);

  // 自动滚到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayText, streamingText, currentChoices]);

  // 清除数值变化提示
  useEffect(() => {
    if (statChanges) {
      const timer = setTimeout(() => setStatChanges(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [statChanges, setStatChanges]);

  const handleAction = useCallback(
    async (action: string) => {
      if (!gameState || isLoading) return;

      // 记录章节：把当前显示的剧情 + 玩家选择记入宫册
      const choicesAtMoment = pendingChoicesRef.current.length > 0
        ? pendingChoicesRef.current
        : currentChoices;
      recordChapter(action, choicesAtMoment);

      addPlayerAction(action);
      setLoading(true);
      setDisplayText("");
      setStreamingText("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameState: {
              ...gameState,
              history: [
                ...gameState.history,
                { role: "player", content: action, timestamp: Date.now() },
              ],
            },
            playerInput: action,
          }),
        });

        if (!res.ok) throw new Error("AI 请求失败");

        // 后端现在返回完整 JSON（不再是流式文本）
        const fullText = await res.text();

        let aiResponse: AIResponse;
        try {
          aiResponse = JSON.parse(fullText);
        } catch {
          console.error("JSON parse failed, raw:", fullText.slice(0, 300));
          aiResponse = {
            narration: fullText || "（剧情生成遇到了一点波折...）",
            choices: [
              { id: 1, text: "继续观望" },
              { id: 2, text: "采取行动" },
              { id: 3, text: "另寻他法" },
            ],
            stat_changes: {},
            episode_end: false,
            ending: null,
          };
        }

        // 确保 choices 一定有值
        if (!aiResponse.choices || aiResponse.choices.length === 0) {
          aiResponse.choices = [
            { id: 1, text: "继续观望" },
            { id: 2, text: "采取行动" },
            { id: 3, text: "另寻他法" },
          ];
        }

        // 确保 stat_changes 存在
        if (!aiResponse.stat_changes) {
          aiResponse.stat_changes = {};
        }

        setDisplayText(aiResponse.narration);
        setStreamingText("");
        pendingChoicesRef.current = aiResponse.choices;
        applyAIResponse(aiResponse);

        // 章节摘要生成：每3节自动生成一次（后台调用，不阻塞UI）
        const stateAfterApply = useGameStore.getState().gameState;
        if (stateAfterApply && stateAfterApply.currentSection % 3 === 0 && stateAfterApply.currentEpisode > 10) {
          useGameStore.getState().generateChapterSummary().catch(console.error);
        }

        // 预生成加速：并行预取后续三个选项 (使用更新后的状态)
        const updatedState = useGameStore.getState().gameState;
        if (updatedState && aiResponse.choices && aiResponse.choices.length > 0) {
          triggerPrefetch(updatedState, aiResponse.choices.map(c => c.text));
        }
      } catch (err) {
        console.error("AI error:", err);
        setDisplayText("（剧情生成遇到了一点波折，请重新选择...）");
        setStreamingText("");
        setLoading(false);
        const fallbackChoices = choicesAtMoment.length > 0 ? choicesAtMoment : currentChoices;
        setChoices(fallbackChoices);
        pendingChoicesRef.current = fallbackChoices;
      }
    },
    [gameState, isLoading, currentChoices, addPlayerAction, setLoading, setStreamingText, applyAIResponse, setChoices, recordChapter]
  );

  if (!gameState) return null;

  const rankIdx = RANK_ORDER.indexOf(gameState.rank);
  const rankProgress = ((rankIdx + 1) / RANK_ORDER.length) * 100;

  return (
    <div className="h-dvh flex flex-col overflow-hidden safe-top">
      {/* ====== 顶部状态栏 ====== */}
      <header
        className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b shrink-0"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-gold)" }}
      >
        {/* 左：返回+集数 */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => { autoSave(); setScreen("home"); }}
            className="text-xs sm:text-sm shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            ← 退出
          </button>
          <div className="w-px h-3" style={{ background: "var(--border-gold)" }} />
          <span className="text-xs sm:text-sm shrink-0" style={{ color: "var(--text-gold)" }}>
            第{gameState.currentEpisode}集 · 第{gameState.currentSection}节
          </span>
        </div>

        {/* 中：头像+位份 */}
        <div className="text-center flex flex-col items-center min-w-0 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg">{AVATAR_OPTIONS.find(a => a.id === gameState.playerProfile.avatarId)?.emoji || '🌸'}</span>
            <span className="text-xs sm:text-sm font-semibold truncate" style={{ color: "var(--palace-gold)" }}>
              {getRankTitle(gameState.rank, gameState.playerProfile)}
            </span>
          </div>
          <div className="w-16 sm:w-24 h-1 mt-1 rounded-full overflow-hidden" style={{ background: "rgba(212,175,55,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${rankProgress}%`, background: "var(--palace-gold)" }}
            />
          </div>
        </div>

        {/* 右：宫册 + 属性 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setScreen("book")}
            className="px-2 py-1 border rounded text-xs transition-colors active:scale-95"
            style={{ borderColor: "var(--border-gold)", color: "var(--text-gold)" }}
          >
            宫册
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-2 py-1 border rounded text-xs transition-colors active:scale-95"
            style={{ borderColor: "var(--border-gold)", color: "var(--text-gold)" }}
          >
            属性
          </button>
        </div>
      </header>

      {/* ====== 属性面板（展开） ====== */}
      {showStats && (
        <div className="animate-fade-in-up border-b" style={{ borderColor: "var(--border-gold)" }}>
          <StatPanel stats={gameState.stats} rank={gameState.rank} episode={gameState.currentEpisode} />
        </div>
      )}

      {/* ====== 数值变化浮动提示 ====== */}
      {statChanges && <StatChangeToast changes={statChanges} />}

      {/* ====== 主内容区（剧情+选项一起滚动） ====== */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto min-h-full px-4 sm:px-6 md:px-10 py-6 sm:py-10" style={{ background: "var(--bg-primary)" }}>
          {/* 剧情文本 */}
          <StoryViewer
            text={streamingText || displayText}
            isStreaming={isLoading}
          />

          {/* 潜台词面板 */}
          {pendingSubtext && !isLoading && (
            <SubtextPanel
              subtext={pendingSubtext}
              isRevealed={isSubtextRevealed}
              insight={gameState.stats.insight}
              onReveal={revealSubtext}
            />
          )}

          {/* 加载提示 */}
          {isLoading && !streamingText && (
            <div className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span className="inline-block animate-pulse">正在谱写红墙秘史...</span>
            </div>
          )}

          {/* 选项/输入区 — 紧跟剧情文本下方 */}
          {!isLoading && currentChoices.length > 0 && (
            <div className="mt-6 sm:mt-8 mb-4 safe-bottom">
              <div className="divider-gold mb-4 sm:mb-6" />
              <ActionInput 
                onAction={handleAction} 
                options={currentChoices} 
                disabled={isLoading}
                currentEpisode={gameState.currentEpisode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
