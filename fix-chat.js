const fs = require('fs');
let content = fs.readFileSync('app/api/chat/route.ts', 'utf8');

// Fix 1: Import BRANCH_MAP
const oldImport = `import { 
  shouldUseFixedScript, 
  getNextSceneId,
  FIXED_SCENES,
  EP_FLOWS
} from '@/lib/fixed-script';`;
const newImport = `import { 
  shouldUseFixedScript, 
  getNextSceneId,
  FIXED_SCENES,
  EP_FLOWS,
  BRANCH_MAP
} from '@/lib/fixed-script';`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('Import updated');
} else {
  console.log('WARNING: import pattern not found');
}

// Fix 2: In the fixed script section, pass the correct choiceId to getNextSceneId
// The current code finds the choice but doesn't pass its actual id properly
// Also fix: when isFirstChoice, use BRANCH_MAP for determining the correct branch scene
const oldChoiceLogic = `        // 生成下一场景
        const nextSceneId = getNextSceneId(currentSceneId, selectedChoice?.id || 1);`;
const newChoiceLogic = `        // 生成下一场景（传递正确的选择ID以支持分支）
        const selectedChoiceId = selectedChoice?.id || 1;
        const nextSceneId = getNextSceneId(currentSceneId, selectedChoiceId);`;

if (content.includes(oldChoiceLogic)) {
  content = content.replace(oldChoiceLogic, newChoiceLogic);
  console.log('Choice logic updated');
} else {
  console.log('WARNING: choice logic pattern not found');
}

fs.writeFileSync('app/api/chat/route.ts', content, 'utf8');
console.log('chat/route.ts updated');
