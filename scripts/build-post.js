import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_JSON_PATH = path.resolve(__dirname, '../origin/regex-mvu.json');
const OUTPUT_JSON_PATH = path.resolve(__dirname, '../dist/regex-mvu.json');
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

  const distHtml = fs.readFileSync(DIST_HTML_PATH, 'utf8');
  const jsonContent = fs.readFileSync(INPUT_JSON_PATH, 'utf8');
  const data = JSON.parse(jsonContent);

  // Wrap the HTML content in markdown code block
  data.replaceString = `\`\`\`html\n${distHtml}\n\`\`\``;

  // Make sure output folder exists
  const outputDir = path.dirname(OUTPUT_JSON_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(data, null, 4), 'utf8');
  console.log(`Successfully compiled and generated output at ${OUTPUT_JSON_PATH}`);
}

main();
