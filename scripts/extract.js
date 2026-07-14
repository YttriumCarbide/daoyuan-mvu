import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse } from 'node-html-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.resolve(__dirname, '../origin/regex-mvu.json');
const SRC_DIR = path.resolve(__dirname, '../src');
const INDEX_HTML_PATH = path.resolve(SRC_DIR, 'index.html');

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`File not found: ${JSON_PATH}`);
    process.exit(1);
  }

  // Safety check for overwriting
  const force = process.argv.includes('--force');
  if (fs.existsSync(INDEX_HTML_PATH) && !force) {
    console.error(`[Error] src/index.html already exists. Extraction aborted to prevent data loss.`);
    console.error(`If you really want to overwrite src/ (which will delete any uncommitted work in src/), run:`);
    console.error(`  pnpm run extract -- --force`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(fileContent);
  let html = data.replaceString || '';

  // Robustly clean markdown blocks (handles both \n and \r\n, and any number of backticks)
  html = html.replace(/^`+html[\r\n]+/, '');
  html = html.replace(/[\r\n]+`+$/, '');

  // Ensure src directory exists
  if (!fs.existsSync(SRC_DIR)) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
  }

  // Parse HTML using node-html-parser for robust DOM manipulation
  const root = parse(html, {
    script: true,
    style: true,
    comment: true,
  });

  // Extract inline CSS
  const styles = [];
  const styleElements = root.querySelectorAll('style');
  for (const styleEl of styleElements) {
    styles.push(styleEl.textContent.trim());
    styleEl.remove(); // Safely remove from DOM
  }

  // Extract inline JS
  const scripts = [];
  const scriptElements = root.querySelectorAll('script');
  for (const scriptEl of scriptElements) {
    if (scriptEl.hasAttribute('src')) {
      continue; // Keep external script
    }
    
    const type = scriptEl.getAttribute('type');
    // Only extract valid JS types or typeless scripts.
    // Skips things like type="application/json" or type="x-template"
    if (!type || type === 'text/javascript' || type === 'application/javascript' || type === 'module') {
      scripts.push(scriptEl.textContent.trim());
      scriptEl.remove();
    }
  }

  // Write style.css
  const combinedCss = styles.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(SRC_DIR, 'style.css'), combinedCss, 'utf8');
  console.log(`Successfully extracted CSS to src/style.css (${combinedCss.length} bytes)`);

  // Write main.js
  const combinedJs = scripts.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(SRC_DIR, 'main.js'), combinedJs, 'utf8');
  console.log(`Successfully extracted JS to src/main.js (${combinedJs.length} bytes)`);

  // Inject links to local CSS/JS into index.html robustly
  let head = root.querySelector('head');
  let body = root.querySelector('body');

  if (head) {
    head.appendChild(parse('\n    <link rel="stylesheet" href="./style.css">\n'));
  } else {
    // If no <head>, insert at the top of the file
    root.insertAdjacentHTML('afterbegin', '<link rel="stylesheet" href="./style.css">\n');
  }

  if (body) {
    body.appendChild(parse('\n    <script type="module" src="./main.js"></script>\n'));
  } else {
    // If no <body>, insert at the end of the file
    root.appendChild(parse('\n<script type="module" src="./main.js"></script>\n'));
  }

  const cleanHtml = root.toString();
  fs.writeFileSync(INDEX_HTML_PATH, cleanHtml, 'utf8');
  console.log(`Successfully extracted HTML to src/index.html (${cleanHtml.length} bytes)`);

  // Format the files with prettier automatically
  try {
    console.log('Formatting files with Prettier...');
    execSync('npx prettier --write src/main.js src/style.css src/index.html', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Could not run Prettier formatting automatically:', error.message);
  }
}

main();
