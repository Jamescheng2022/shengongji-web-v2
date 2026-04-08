import { create } from 'zustand';
import {
  type GameState,
  type AIResponse,
  type StoryEntry,
  type PlayerProfile,
  type ChapterSummary,
  createNewGame,
  processAIResponse,
  applyStatChanges,
  addChapter,
  addChapterSummary,
  rewindToChapter,
  canFreeRewind,
  useFreeRewind,
  shouldGenerateSummary,
  saveSave,
  getAllSaves,
  deleteSave,
} from './game-engine';

export type Screen = 'home' | 'play' | 'saves' | 'ending' | 'book' | 'help' | 'character-setup';

interface GameStore {
  // 导航
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // 游戏状态
  gameState: GameState | null;
  isLoading: boolean;
  currentChoices: { id: number; text: string; stat_changes?: Partial<GameState['stats']> }[];
  streamingText: string;
  statChanges: Partial<GameState['stats']> | null;
  lastNarration: string;  // 最近一次AI返回的剧情文本（用于记录章节）
  lastStatChanges: Partial<GameState['stats']>;  // 最近一次属性变化（用于记录章节）

  // 潜台词系统
  pendingSubtext: string;  // 待解码的潜台词
  isSubtextRevealed: boolean;  // 潜台词是否已解锁

  // 存档
  saves: GameState[];

  // 操作
  startNewGame: (profile?: Partial<PlayerProfile>) => void;
  loadGame: (save: GameState) => void;
  refreshSaves: () => void;
  removeSave: (id: string) => void;

  // 游戏流程
  addPlayerAction: (action: string) => void;
  setStreamingText: (text: string) => void;
  applyAIResponse: (response: AIResponse) => void;
  setLoading: (loading: boolean) => void;
  setChoices: (choices: { id: number; text: string; stat_changes?: Partial<GameState['stats']> }[]) => void;
  setStatChanges: (changes: Partial<GameState['stats']> | null) => void;
  setLastNarration: (text: string) => void;

  // 潜台词解码
  revealSubtext: () => void;  // 消耗洞察力，解锁潜台词

  // 宫册·章节记录
  recordChapter: (playerChoice: string, availableChoices: { id: number; text: string }[]) => void;

  // 章节摘要生成
  generateChapterSummary: () => Promise<void>;  // 调用API生成章节摘要

  // 改命·回退
  rewindToChapter: (chapterId: string) => void;

  // 自动存档
  autoSave: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'home',
  setScreen: (screen) => set({ screen }),

  gameState: null,
  isLoading: false,
  currentChoices: [],
  streamingText: '',
  statChanges: null,
  lastNarration: '',
  lastStatChanges: {},
  // 潜台词系统
  pendingSubtext: '',
  isSubtextRevealed: false,
  saves: [],

  startNewGame: (profile) => {
    const newGame = createNewGame('存档一', profile);
    saveSave(newGame);
    set({
      gameState: newGame,
      screen: 'play',
      currentChoices: [],
      streamingText: '',
      statChanges: null,
      lastNarration: '',
      lastStatChanges: {},
      pendingSubtext: '',
      isSubtextRevealed: false,
    });
  },

  loadGame: (save) => {
    set({
      gameState: save,
      screen: 'play',
      currentChoices: save.pendingChoices || [],
      streamingText: '',
      statChanges: null,
      lastNarration: save.pendingNarration || '',
      lastStatChanges: save.pendingStatChanges || {},
      pendingSubtext: save.pendingSubtext || '',
      isSubtextRevealed: false, // 读档后重置潜台词显示状态
    });
  },

  refreshSaves: () => {
    set({ saves: getAllSaves() });
  },

  removeSave: (id) => {
    deleteSave(id);
    set({ saves: getAllSaves() });
  },

  addPlayerAction: (action) => {
    const { gameState } = get();
    if (!gameState) return;

    const entry: StoryEntry = {
      role: 'player',
      content: action,
      timestamp: Date.now(),
    };

    set({
      gameState: {
        ...gameState,
        history: [...gameState.history, entry],
        updatedAt: Date.now(),
      },
      currentChoices: [],
    });
  },

  setStreamingText: (text) => set({ streamingText: text }),
  setLastNarration: (text) => set({ lastNarration: text }),

  applyAIResponse: (response) => {
    const { gameState } = get();
    if (!gameState) return;

    const diff: Partial<GameState['stats']> = {};
    for (const [k, v] of Object.entries(response.stat_changes)) {
      if (v !== 0) (diff as Record<string, number>)[k] = v as number;
    }

    const newState = processAIResponse(gameState, response);
    saveSave(newState);

    set({
      gameState: newState,
      currentChoices: response.choices,
      streamingText: '',
      statChanges: Object.keys(diff).length > 0 ? diff : null,
      isLoading: false,
      lastNarration: response.narration,
      lastStatChanges: response.stat_changes,
      // 潜台词系统
      pendingSubtext: response.subtext || '',
      isSubtextRevealed: false, // 新剧情默认隐藏潜台词
    });

    // 如果有结局，跳转结局页
    if (newState.ending) {
      setTimeout(() => set({ screen: 'ending' }), 2000);
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setChoices: (choices) => set({ currentChoices: choices }),
  setStatChanges: (changes) => set({ statChanges: changes }),

  // ====== 潜台词解码 ======
  revealSubtext: () => {
    const { gameState, isSubtextRevealed } = get();
    if (!gameState || isSubtextRevealed || !gameState.stats.insight) return;
    if (gameState.stats.insight < 1) return; // 需要1点洞察力

    // 消耗1点洞察力
    const newStats = applyStatChanges(gameState.stats, { insight: -1 });
    const updatedState = { ...gameState, stats: newStats };
    saveSave(updatedState);

    set({
      gameState: updatedState,
      isSubtextRevealed: true, // 解锁潜台词
      statChanges: { insight: -1 },
    });
  },

  // ====== 宫册·记录章节 ======
  recordChapter: (playerChoice, availableChoices) => {
    const { gameState, lastNarration, lastStatChanges } = get();
    if (!gameState || !lastNarration) return;

    const updatedState = addChapter(
      gameState,
      lastNarration,
      playerChoice,
      availableChoices,
      lastStatChanges,
    );

    saveSave(updatedState);
    set({ gameState: updatedState });
  },

  // ====== 改命·回退 ======
  rewindToChapter: (chapterId) => {
    const { gameState } = get();
    if (!gameState) return;

    const hasFree = canFreeRewind(gameState);
    let state = gameState;

    if (!hasFree) {
      // 扣银两
      if (state.stats.silver < 50) return;
      state = { ...state, stats: { ...state.stats, silver: state.stats.silver - 50 } };
    } else {
      state = useFreeRewind(state);
    }

    const rewound = rewindToChapter(state, chapterId);
    if (!rewound) return;

    saveSave(rewound);
    set({
      gameState: rewound,
      currentChoices: rewound.pendingChoices || [],
      lastNarration: rewound.pendingNarration || '',
      lastStatChanges: rewound.pendingStatChanges || {},
      streamingText: '',
      statChanges: null,
      isLoading: false,
    });
  },

  // ====== 章节摘要生成 ======
  generateChapterSummary: async () => {
    const { gameState } = get();
    if (!gameState) return;

    // 检查是否需要生成摘要
    if (!shouldGenerateSummary(gameState)) {
      console.log('[store] Not at summary point, skipping');
      return;
    }

    // 第11集之后才生成摘要（之前用固定剧本）
    if (gameState.currentEpisode <= 10) {
      console.log('[store] Episode <= 10, skipping summary');
      return;
    }

    console.log('[store] Generating chapter summary for episode', gameState.currentEpisode);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState }),
      });

      const data = await response.json();

      if (data.success && data.summary) {
        const updatedState = {
          ...gameState,
          chapterSummaries: [...gameState.chapterSummaries, data.summary].slice(-10),
        };
        saveSave(updatedState);
        set({ gameState: updatedState });
        console.log('[store] Chapter summary generated successfully');
      } else if (data.skipped) {
        console.log('[store] Summary skipped:', data.reason);
      }
    } catch (e) {
      console.error('[store] Failed to generate summary:', e);
    }
  },

  autoSave: () => {
    const { gameState } = get();
    if (gameState) saveSave(gameState);
  },
}));
