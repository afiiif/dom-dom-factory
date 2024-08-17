import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const content = readFileSync('./lib/dom.ts', { encoding: 'utf-8' });
const modified = '{' + content.replaceAll('export', '') + '\n(window as any).$ = $;\n}';

mkdirSync('./output', { recursive: true });
writeFileSync('./output/dom.ts', modified);
