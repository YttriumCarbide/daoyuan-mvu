import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pretty from 'pretty';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const target = process.env.BUILD_TARGET === 'shujuku' ? 'shujuku' : 'mvu';
const INPUT_JSON_PATH = path.resolve(__dirname, `../origin/regex-${target}.json`);
const OUTPUT_JSON_PATH = path.resolve(__dirname, `../dist/regex-${target}.json`);
const DIST_HTML_PATH = path.resolve(__dirname, '../dist/index.html');

function main() {
  if (!fs.existsSync(DIST_HTML_PATH)) {
    console.error(`Build output not found at ${DIST_HTML_PATH}. Did you run pnpm build first?`);
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_JSON_PATH)) {
    console.error(`Input JSON not found at ${INPUT_JSON_PATH}`);
    process.exit(1);
  }

  const rawDistHtml = fs.readFileSync(DIST_HTML_PATH, 'utf8');
  const distHtml = pretty(rawDistHtml);
  fs.writeFileSync(DIST_HTML_PATH, distHtml, 'utf8');
  const jsonContent = fs.readFileSync(INPUT_JSON_PATH, 'utf8');
  const data = JSON.parse(jsonContent);

  // Dynamically determine how many backticks are needed to safely wrap the HTML
  // (Prevents markdown injection if the HTML itself contains triple backticks)
  const match = distHtml.match(/`+/g);
  let backtickCount = 3;
  if (match) {
    const maxBackticks = Math.max(...match.map(s => s.length));
    if (maxBackticks >= 3) {
      backtickCount = maxBackticks + 1;
    }
  }
  const fence = '`'.repeat(backtickCount);

  // Wrap the HTML content in markdown code block
  data.replaceString = `${fence}html\n${distHtml}\n${fence}`;

  // Make sure output folder exists
  const outputDir = path.dirname(OUTPUT_JSON_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(data, null, 4), 'utf8');
  console.log(`Successfully compiled and generated output at ${OUTPUT_JSON_PATH}`);
}

main();
