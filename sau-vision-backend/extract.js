const fs = require('fs');
const log = fs.readFileSync('C:/Users/moham/.gemini/antigravity/brain/da7535f1-4c08-41f1-86c9-5e0671693c25/.system_generated/logs/overview.txt', 'utf8');
const searchStr = '"module":"Server"';
const idx = log.indexOf(searchStr);
if (idx !== -1) {
  console.log('Found module Server at', idx);
  // the JSON probably starts with { just before it
  let startIdx = log.lastIndexOf('{', idx);
  // find the matching closing bracket
  let open = 0;
  let endIdx = -1;
  for (let i = startIdx; i < log.length; i++) {
    if (log[i] === '{') open++;
    else if (log[i] === '}') {
      open--;
      if (open === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  if (endIdx !== -1) {
    const jsonStr = log.substring(startIdx, endIdx);
    console.log('Found JSON of length', jsonStr.length);
    try {
      const data = JSON.parse(jsonStr);
      // replace base64
      let node = data.app.nodes.find(n => n.name === 'ImageLoad');
      node.configs.executor.value.value.configs.imageFieldType.value.path.value = '__BASE64_PLACEHOLDER__';
      fs.writeFileSync('pipeline-template.json', JSON.stringify(data, null, 2));
      console.log('SUCCESS');
    } catch(e) {
      console.log('Parse error', e.message);
    }
  }
} else {
  console.log('Not found');
}
