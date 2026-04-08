const fs = require('fs');
let content = fs.readFileSync('lib/fixed-script.ts', 'utf8');

// Fix 1: EP_FLOWS - remove ep1_s2_b from ep1_flow
content = content.replace(
  "ep1_flow: ['ep1_s1', 'ep1_s2_a', 'ep1_s2_b', 'ep1_s3'],",
  "ep1_flow: ['ep1_s1', 'ep1_s2_a', 'ep1_s3'],  // ep1_s2_b is a branch via BRANCH_MAP"
);

// Fix 2: Add BRANCH_MAP after EP_FLOWS
const epFlowsEnd = content.indexOf('};', content.indexOf('ep10_flow'));
const insertPos = epFlowsEnd + 2;
const branchMap = "\r\n\r\n// 分支映射：根据 sceneId + choiceId 决定下一场景\r\nexport const BRANCH_MAP: Record<string, Record<number, string>> = {\r\n  'ep1_s1': {\r\n    1: 'ep1_s2_a',  // 选择1：隐忍退后\r\n    2: 'ep1_s2_b',  // 选择2：不卑不亢回应\r\n    3: 'ep1_s2_a',  // 选择3：解读潜台词 -> 默认走 a 分支\r\n  },\r\n};";
content = content.slice(0, insertPos) + branchMap + content.slice(insertPos);

// Fix 3: Update getNextSceneId to check BRANCH_MAP first
const oldPattern = "export function getNextSceneId(currentSceneId: string, choiceId: number): string | undefined {\r\n  const currentScene = FIXED_SCENES[currentSceneId];\r\n  if (!currentScene) return undefined;\r\n  \r\n  // 如果有明确的下一场景指引";
const newPattern = "export function getNextSceneId(currentSceneId: string, choiceId: number): string | undefined {\r\n  const currentScene = FIXED_SCENES[currentSceneId];\r\n  if (!currentScene) return undefined;\r\n  \r\n  // 优先检查分支映射（基于玩家选择的分支）\r\n  const branchNext = BRANCH_MAP[currentSceneId]?.[choiceId];\r\n  if (branchNext && FIXED_SCENES[branchNext]) {\r\n    return branchNext;\r\n  }\r\n  \r\n  // 如果有明确的下一场景指引";

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  console.log('getNextSceneId updated');
} else {
  console.log('WARNING: Could not find getNextSceneId pattern');
}

fs.writeFileSync('lib/fixed-script.ts', content, 'utf8');
console.log('fixed-script.ts updated successfully');
