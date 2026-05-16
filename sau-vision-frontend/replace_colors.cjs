const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-\[\#060d18\]/g, replacement: 'bg-background' },
  { regex: /bg-\[\#0d1829\]/g, replacement: 'bg-card' },
  { regex: /bg-\[\#0a1322\]/g, replacement: 'bg-white dark:bg-[#0a1322]' },
  { regex: /text-white/g, replacement: 'text-foreground' },
  { regex: /border-white\/10/g, replacement: 'border-border' },
  { regex: /bg-white\/5/g, replacement: 'bg-slate-100 dark:bg-white/5' },
  { regex: /text-gray-300/g, replacement: 'text-slate-600 dark:text-gray-300' },
  { regex: /text-gray-400/g, replacement: 'text-slate-500 dark:text-gray-400' },
  { regex: /text-gray-500/g, replacement: 'text-slate-400 dark:text-gray-500' },
  { regex: /border-white\/5/g, replacement: 'border-slate-100 dark:border-white/5' },
  { regex: /hover:bg-white\/10/g, replacement: 'hover:bg-slate-200 dark:hover:bg-white/10' },
  { regex: /hover:bg-white\/5/g, replacement: 'hover:bg-slate-100 dark:hover:bg-white/5' },
  { regex: /bg-navy-900/g, replacement: 'bg-slate-100 dark:bg-navy-900' },
  { regex: /bg-navy-800/g, replacement: 'bg-white dark:bg-navy-800' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;

      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log('Replacement complete.');
