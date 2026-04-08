const fs = require('fs');
let c = fs.readFileSync('components/PlayScreen.tsx', 'utf8');

// 1. Add import
c = c.replace(
  'import { SubtextPanel } from "./SubtextPanel";',
  'import { SubtextPanel } from "./SubtextPanel";\r\nimport HighlightQuote from "./HighlightQuote";'
);

// 2. Add pendingHighlight to destructured store values
c = c.replace(
  "    // 潜台词系统\r\n    pendingSubtext,",
  "    // 金句高亮\r\n    pendingHighlight,\r\n    // 潜台词系统\r\n    pendingSubtext,"
);

// 3. Insert HighlightQuote component after StoryViewer and before SubtextPanel
c = c.replace(
  "          {/* 潜台词面板 */}\r\n          {pendingSubtext && !isLoading && (",
  "          {/* 金句高亮 */}\r\n          {pendingHighlight && !isLoading && (\r\n            <HighlightQuote\r\n              quote={pendingHighlight}\r\n              episode={gameState.currentEpisode}\r\n              section={gameState.currentSection}\r\n              playerName={gameState.playerProfile.fullName}\r\n            />\r\n          )}\r\n\r\n          {/* 潜台词面板 */}\r\n          {pendingSubtext && !isLoading && ("
);

console.log('Import:', c.includes('HighlightQuote') ? 'OK' : 'FAIL');
console.log('Destructure:', c.includes('pendingHighlight,') ? 'OK' : 'FAIL');
console.log('Component:', c.includes('<HighlightQuote') ? 'OK' : 'FAIL');

fs.writeFileSync('components/PlayScreen.tsx', c, 'utf8');
console.log('PlayScreen.tsx saved');
