const fs = require('fs');

// ============================================================
// P0-1: game-engine.ts — AIResponse 新增 highlight 字段
// ============================================================
let ge = fs.readFileSync('lib/game-engine.ts', 'utf8');

// 1a. Add highlight to AIResponse interface
ge = ge.replace(
  "  subtext?: string;    // 潜台词\r\n  title?: string;       // 章回标题",
  "  subtext?: string;    // 潜台词\r\n  title?: string;       // 章回标题\r\n  highlight?: string;   // 金句高亮（本段最值得截图的一句话）"
);
console.log('1a. AIResponse highlight field:', ge.includes('highlight?: string') ? 'OK' : 'FAIL');

// 1b. sanitizeAIResponse — preserve highlight
ge = ge.replace(
  "    subtext: response.subtext || undefined,\r\n    title: response.title || undefined,",
  "    subtext: response.subtext || undefined,\r\n    title: response.title || undefined,\r\n    highlight: response.highlight || undefined,"
);
console.log('1b. sanitizeAIResponse highlight:', ge.includes('highlight: response.highlight') ? 'OK' : 'FAIL');

fs.writeFileSync('lib/game-engine.ts', ge, 'utf8');
console.log('game-engine.ts saved');

// ============================================================
// P0-1: prompts.ts — 输出格式新增 highlight 字段要求
// ============================================================
let pr = fs.readFileSync('lib/prompts.ts', 'utf8');

// 2a. Add highlight to JSON output format spec
pr = pr.replace(
  '  "narration": "剧情文本（150-300字，使用\\\\n换行）",',
  '  "narration": "剧情文本（150-300字，使用\\\\n换行）",\r\n  "highlight": "本段最具冲击力的一句话（10-25字，用于截图分享。从narration中提炼，如：你以为你在选命运，其实命运早已选了你）",'
);
console.log('2a. Prompt highlight in format:', pr.includes('"highlight"') ? 'OK' : 'FAIL');

// 2b. Add writing requirement for highlight
pr = pr.replace(
  "6. **⚠️ 选项必须与剧情匹配**",
  "6. **⚠️ 金句(highlight)**：每段剧情必须提炼一句最有冲击力的话作为highlight，要求：\r\n   - 10-25字，古典优雅，发人深省\r\n   - 适合被截图分享到社交媒体\r\n   - 示例：「你以为你在选择命运，其实命运早已选择了你」\r\n   - 示例：「这宫里，低头不一定输，但抬头一定死」\r\n   - 示例：「她笑着递过毒药，嘴里说的是关心」\r\n7. **⚠️ 选项必须与剧情匹配**"
);
console.log('2b. Prompt highlight requirement:', pr.includes('金句(highlight)') ? 'OK' : 'FAIL');

fs.writeFileSync('lib/prompts.ts', pr, 'utf8');
console.log('prompts.ts saved');

// ============================================================
// P0-1: fixed-script.ts — 每个场景新增 highlight
// ============================================================
let fs2 = require('fs');
let fx = fs2.readFileSync('lib/fixed-script.ts', 'utf8');

// Add highlight field to FixedScene interface
fx = fx.replace(
  "  episode_end?: boolean; // 第十集结束\r\n}",
  "  episode_end?: boolean; // 第十集结束\r\n  highlight?: string;    // 金句高亮\r\n}"
);
console.log('3a. FixedScene highlight type:', fx.includes('highlight?: string') ? 'OK' : 'FAIL');

// Add highlight to getSceneForEpisode return value
fx = fx.replace(
  "    subtext: scene.subtext,",
  "    subtext: scene.subtext,\r\n    highlight: scene.highlight,"
);
console.log('3b. getSceneForEpisode highlight:', fx.includes('highlight: scene.highlight') ? 'OK' : 'FAIL');

// Now add highlight to each ep1 scene
// ep1_s1
fx = fx.replace(
  "    subtext: '（乌兰在试探储秀宫的权力格局",
  "    highlight: '进了这道门，生死荣辱，全凭各人造化',\r\n    subtext: '（乌兰在试探储秀宫的权力格局"
);

// ep1_s2_a
fx = fx.replace(
  "    subtext: '（王嬷嬷在观察",
  "    highlight: '退一步未必海阔天空，但至少还能活着看天',\r\n    subtext: '（王嬷嬷在观察"
);

// ep1_s2_b 
const ep1s2bSubtext = fx.indexOf("'ep1_s2_b':");
if (ep1s2bSubtext > -1) {
  fx = fx.replace(
    /('ep1_s2_b':[\s\S]*?)subtext: '/,
    function(match, prefix) {
      // Only replace the first occurrence after ep1_s2_b
      return prefix.replace("subtext: '", "highlight: '不卑不亢四个字，说起来轻巧，做起来要命',\r\n    subtext: '");
    }
  );
}

// ep1_s3
const ep1s3 = fx.indexOf("'ep1_s3':");
if (ep1s3 > -1) {
  // Find the subtext in ep1_s3
  const ep1s3Chunk = fx.substring(ep1s3, ep1s3 + 2000);
  if (ep1s3Chunk.includes("subtext: '")) {
    // Add highlight before subtext in ep1_s3
    const ep1s3SubtextIdx = fx.indexOf("subtext: '", ep1s3);
    if (ep1s3SubtextIdx > -1) {
      fx = fx.substring(0, ep1s3SubtextIdx) + 
        "highlight: '这宫里最安全的位置，是别人看不见你的位置',\r\n    " + 
        fx.substring(ep1s3SubtextIdx);
    }
  }
}

console.log('3c. Highlights added to scenes');

fs2.writeFileSync('lib/fixed-script.ts', fx, 'utf8');
console.log('fixed-script.ts saved');

// ============================================================
// P0-1: store.ts — preserve highlight in applyAIResponse
// ============================================================
let st = fs.readFileSync('lib/store.ts', 'utf8');

// Add pendingHighlight to store state
st = st.replace(
  "  pendingSubtext: string;  // 待解码的潜台词",
  "  pendingSubtext: string;  // 待解码的潜台词\r\n  pendingHighlight: string; // 当前剧情的金句高亮"
);

// Initialize in startNewGame
st = st.replace(
  "      pendingSubtext: '',\r\n      isSubtextRevealed: false,\r\n    });\r\n  },\r\n\r\n  loadGame:",
  "      pendingSubtext: '',\r\n      pendingHighlight: '',\r\n      isSubtextRevealed: false,\r\n    });\r\n  },\r\n\r\n  loadGame:"
);

// Initialize in loadGame
st = st.replace(
  "      pendingSubtext: save.pendingSubtext || '',\r\n      isSubtextRevealed: false, // 读档后重置潜台词显示状态",
  "      pendingSubtext: save.pendingSubtext || '',\r\n      pendingHighlight: '',\r\n      isSubtextRevealed: false, // 读档后重置潜台词显示状态"
);

// Set in applyAIResponse
st = st.replace(
  "      pendingSubtext: response.subtext || '',\r\n      isSubtextRevealed: false, // 新剧情默认隐藏潜台词",
  "      pendingSubtext: response.subtext || '',\r\n      pendingHighlight: response.highlight || '',\r\n      isSubtextRevealed: false, // 新剧情默认隐藏潜台词"
);

// Add to initial state
st = st.replace(
  "  pendingSubtext: '',\r\n  isSubtextRevealed: false,\r\n  saves: [],",
  "  pendingSubtext: '',\r\n  pendingHighlight: '',\r\n  isSubtextRevealed: false,\r\n  saves: [],"
);

console.log('Store pendingHighlight:', st.includes('pendingHighlight') ? 'OK' : 'FAIL');
fs.writeFileSync('lib/store.ts', st, 'utf8');
console.log('store.ts saved');

console.log('\n=== P0-1 Complete ===');
