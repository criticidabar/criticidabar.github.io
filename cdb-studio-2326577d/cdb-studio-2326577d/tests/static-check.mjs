import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const expected='0.33.0';
const required=['index.html','styles.css','app.js','auth.js','sw.js','version.json','js/config.js','js/runtime.js','js/state.js','js/engine.js','js/render.js','js/images.js','js/editorial.js','js/export.js'];
for(const file of required)if(!fs.existsSync(path.join(root,file)))throw new Error(`File mancante: ${file}`);
for(const file of ['index.html','app.js','sw.js','version.json','js/config.js'])if(!read(file).includes(expected))throw new Error(`Versione ${expected} assente da ${file}`);
const html=read('index.html'),ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]),duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
if(duplicates.length)throw new Error(`ID duplicati: ${[...new Set(duplicates)].join(', ')}`);
const cached=['js/runtime.js','js/state.js','js/engine.js','js/render.js','js/images.js','js/editorial.js','js/export.js','app.js','auth.js'];
for(const file of cached)if(!read('sw.js').includes(file))throw new Error(`File non incluso nella cache PWA: ${file}`);
for(const fixture of ['tests/fixtures/content-v031-the-odyssey.json','tests/fixtures/legacy-client-v030.cdb.json'])JSON.parse(read(fixture));
console.log(`OK: ${ids.length} ID univoci, ${required.length} file, versione ${expected}, fixture JSON valide.`);
