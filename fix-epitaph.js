const fs = require('fs');
let content = fs.readFileSync('app/api/epitaph/route.ts', 'utf8');

// Fix: JSON extraction - when matched by /\{[\s\S]*\}/, jsonMatch[1] is undefined
// Use jsonMatch[1] || jsonMatch[0] to handle both capture group and non-capture group cases
const oldLine = "    const epitaphData = JSON.parse(jsonMatch[1]) as EpitaphResult;";
const newLine = "    const epitaphData = JSON.parse(jsonMatch[1] || jsonMatch[0]) as EpitaphResult;";

if (content.includes(oldLine)) {
  content = content.replace(oldLine, newLine);
  fs.writeFileSync('app/api/epitaph/route.ts', content, 'utf8');
  console.log('epitaph/route.ts fixed');
} else {
  console.log('WARNING: pattern not found');
}
