import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.resolve(__dirname, '../origin/regex-mvu.json');
const SRC_DIR = path.resolve(__dirname, '../src');

function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`File not found: ${JSON_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(JSON_PATH, 'utf8');
  const data = JSON.parse(fileContent);
  let html = data.replaceString || '';

  // Clean markdown blocks
  if (html.startsWith('```html\n')) {
    html = html.substring(8);
  } else if (html.startsWith('```html')) {
    html = html.substring(7);
  }
  if (html.endsWith('\n```')) {
    html = html.substring(0, html.length - 4);
  } else if (html.endsWith('```')) {
    html = html.substring(0, html.length - 3);
  }

  // Ensure src directory exists
  if (!fs.existsSync(SRC_DIR)) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
  }

  // Extract inline CSS
  const styles = [];
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    styles.push(styleMatch[1].trim());
  }
  let cleanHtml = html.replace(styleRegex, '');

  // Extract inline JS (scripts without src attribute)
  const scripts = [];
  const scriptRegex = /<script\b([^>]*?)>([\s\S]*?)<\/script>/gi;
  
  // We will selectively strip inline script tags
  cleanHtml = cleanHtml.replace(scriptRegex, (match, attrs, content) => {
    if (attrs.includes('src=')) {
      return match; // Keep external script
    }
    scripts.push(content.trim());
    return ''; // Remove inline script
  });

  // Write style.css
  const combinedCss = styles.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(SRC_DIR, 'style.css'), combinedCss, 'utf8');
  console.log(`Successfully extracted CSS to src/style.css (${combinedCss.length} bytes)`);

  // Write main.js
  const combinedJs = scripts.filter(Boolean).join('\n\n');
  fs.writeFileSync(path.join(SRC_DIR, 'main.js'), combinedJs, 'utf8');
  console.log(`Successfully extracted JS to src/main.js (${combinedJs.length} bytes)`);

  // Inject links to local CSS/JS into index.html
  // Let's first make sure we don't duplicate links if they are already present
  if (!cleanHtml.includes('href="./style.css"') && !cleanHtml.includes('href="/src/style.css"')) {
    cleanHtml = cleanHtml.replace('</head>', '    <link rel="stylesheet" href="./style.css">\n</head>');
  }
  if (!cleanHtml.includes('src="./main.js"') && !cleanHtml.includes('src="/src/main.js"')) {
    cleanHtml = cleanHtml.replace('</body>', '    <script type="module" src="./main.js"></script>\n</body>');
  }

  fs.writeFileSync(path.join(SRC_DIR, 'index.html'), cleanHtml, 'utf8');
  console.log(`Successfully extracted HTML to src/index.html (${cleanHtml.length} bytes)`);

  // Format the files with prettier automatically
  try {
    console.log('Formatting files with Prettier...');
    execSync('npx prettier --write src/main.js src/style.css', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Could not run Prettier formatting automatically:', error.message);
  }
}

main();
