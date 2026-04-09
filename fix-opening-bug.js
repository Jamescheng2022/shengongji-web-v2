const fs = require('fs');
let c = fs.readFileSync('app/api/chat/route.ts', 'utf8');

// 移除“跳过开场重复问题”的逻辑，这会导致预取或交互时出现叙事与选项错位
const oldLogic = `        // ========== 修复：跳过开场重复问题 ==========
        // 如果是第1集第1节的第一个选择（开场已由客户端显示），直接返回下一场景
        const isFirstChoice = gameState.history.length === 0 && currentSection === 1;
        
        // 确定返回哪个场景的叙述和选项
        const displayScene = isFirstChoice && nextScene ? nextScene : currentScene;
        const displayChoices = (isFirstChoice && nextScene) ? nextScene.choices : (nextScene || currentScene).choices;
        
        // 转换为AI响应格式
        const response: AIResponse = {
          title: displayScene.title,
          section: nextSection,
          narration: displayScene.narration,
          subtext: displayScene.subtext,
          stat_changes: selectedChoice?.stat_changes || {},
          choices: displayChoices.map((c, i) => ({
            id: i + 1,
            text: c.text,
            stat_changes: c.stat_changes,
          })),
          episode_end: episodeEnd,
          ending: null,
        };`;

const newLogic = `        // 修正逻辑：直接返回当前选择的结果所导向的“下一场景”
        // 这样点击“选项1”后，返回的就是“结果1对应的叙述”和“后续的选项”
        
        // 转换为AI响应格式
        const response: AIResponse = {
          title: nextScene ? nextScene.title : currentScene.title,
          section: nextSection,
          narration: nextScene ? nextScene.narration : currentScene.narration,
          subtext: nextScene ? nextScene.subtext : currentScene.subtext,
          highlight: nextScene ? nextScene.highlight : currentScene.highlight,
          stat_changes: selectedChoice?.stat_changes || {},
          choices: nextScene ? nextScene.choices.map((c, i) => ({
            id: i + 1,
            text: c.text,
            stat_changes: c.stat_changes,
          })) : [],
          episode_end: episodeEnd,
          ending: null,
        };`;

if (c.includes(oldLogic)) {
  c = c.replace(oldLogic, newLogic);
  console.log('Fixed script skip logic removed.');
} else {
  console.log('WARNING: skip logic pattern not found. Trying flexible match...');
  // 备选方案：尝试更宽松的匹配
  const startIdx = c.indexOf('// ========== 修复：跳过开场重复问题 ==========');
  const endIdx = c.indexOf('setCache(cacheKey, response);');
  if (startIdx > -1 && endIdx > startIdx) {
    const partToReplace = c.substring(startIdx, endIdx);
    c = c.substring(0, startIdx) + newLogic + "\r\n        " + c.substring(endIdx);
    console.log('Fixed script skip logic removed (flexible).');
  }
}

fs.writeFileSync('app/api/chat/route.ts', c, 'utf8');
console.log('chat/route.ts saved.');
