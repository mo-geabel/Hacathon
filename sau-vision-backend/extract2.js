const fs = require('fs');
const log = fs.readFileSync('C:/Users/moham/.gemini/antigravity/brain/da7535f1-4c08-41f1-86c9-5e0671693c25/.system_generated/logs/overview.txt', 'utf8');

let foundStr = '';
let inJson = false;
let braceCount = 0;
let jsonStartIndex = -1;

for (let i = 0; i < log.length; i++) {
  if (log[i] === '{' && log.substring(i, i + 20).includes('"module"')) {
    inJson = true;
    braceCount = 1;
    jsonStartIndex = i;
  } else if (inJson && log[i] === '{') {
    braceCount++;
  } else if (inJson && log[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      inJson = false;
      const jsonStr = log.substring(jsonStartIndex, i + 1);
      if (jsonStr.includes('"ImageLoad"')) {
        console.log('Found full JSON length', jsonStr.length);
        fs.writeFileSync('found.json', jsonStr);
        break;
      }
    }
  }
}
if (jsonStartIndex === -1) {
  console.log('No JSON found starting with {"module"');
}
