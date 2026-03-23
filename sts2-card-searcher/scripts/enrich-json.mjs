import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Converter } from 'opencc-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, '..');
const workspaceDir = path.resolve(projectDir, '..');

const sourcePath = path.join(workspaceDir, 'sts2-card-image-links.json');
const outputPath = path.join(projectDir, 'public', 'data', 'sts2-card-image-links.i18n.json');

const localizedFields = [
  'name',
  'page',
  'color',
  'rarity',
  'type',
  'cost',
  'description_html',
  'description_text'
];

const toTraditional = Converter({ from: 'cn', to: 'tw' });

function localizeText(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;

  return {
    'zh-Hans': value,
    'zh-Hant': toTraditional(value)
  };
}

function enrichCard(card) {
  const i18n = {
    'zh-Hans': {},
    'zh-Hant': {}
  };

  for (const field of localizedFields) {
    const localized = localizeText(card[field]);

    if (localized && typeof localized === 'object' && !Array.isArray(localized)) {
      i18n['zh-Hans'][field] = localized['zh-Hans'];
      i18n['zh-Hant'][field] = localized['zh-Hant'];
    } else {
      i18n['zh-Hans'][field] = localized;
      i18n['zh-Hant'][field] = localized;
    }
  }

  return {
    ...card,
    i18n
  };
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const source = JSON.parse(raw);

const enriched = {
  ...source,
  source_language: 'zh-Hans',
  languages: ['zh-Hans', 'zh-Hant'],
  i18n_generated_at: new Date().toISOString(),
  cards: source.cards.map(enrichCard)
};

const pretty = `${JSON.stringify(enriched, null, 2)}\n`;

fs.writeFileSync(sourcePath, pretty, 'utf8');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, pretty, 'utf8');

console.log(`Updated ${path.relative(workspaceDir, sourcePath)}`);
console.log(`Copied ${path.relative(workspaceDir, outputPath)}`);
console.log(`Cards enriched: ${enriched.cards.length}`);
