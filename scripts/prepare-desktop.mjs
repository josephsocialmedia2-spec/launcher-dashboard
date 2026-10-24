import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'desktop-dist');

const excludedDirs = new Set([
  '.git','.github','node_modules','src-tauri','desktop-dist','tests','docs',
  'supabase','supabase-migrations','windows-bridge','windows-directory-radar'
]);
const blockedExt = new Set(['.sqlite','.sqlite3','.db','.db-wal','.db-shm']);
const blockedNames = new Set(['package-lock.json','Cargo.lock']);

async function copyTree(src, dst, rel='') {
  await fs.mkdir(dst,{recursive:true});
  for (const entry of await fs.readdir(src,{withFileTypes:true})) {
    if (!rel && excludedDirs.has(entry.name)) continue;
    if (blockedNames.has(entry.name)) continue;
    const from=path.join(src,entry.name), to=path.join(dst,entry.name);
    const nextRel=path.join(rel,entry.name);
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      await copyTree(from,to,nextRel);
      continue;
    }
    if (!entry.isFile()) continue;
    if (blockedExt.has(path.extname(entry.name).toLowerCase())) continue;
    await fs.copyFile(from,to);
  }
}

await fs.rm(out,{recursive:true,force:true});
await copyTree(root,out);
console.log('F1 desktop frontend prepared:',out);
