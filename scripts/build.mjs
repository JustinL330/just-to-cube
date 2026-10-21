import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {cp,mkdir,readdir,rm,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true}); await cp('src','dist/src',{recursive:true});
const base=path.resolve('node_modules/cubing/dist/lib/cubing');
async function walk(dir){let out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory())out.push(...await walk(p));else if(p.endsWith('.js'))out.push(p);}return out;}
await build({entryPoints:await walk(base),outbase:base,outdir:'dist/vendor/cubing',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,plugins:[{name:'preserve-cubing-paths',setup(b){b.onResolve({filter:/^\./},a=>a.importer.startsWith(base)?{path:a.path,external:true}:undefined)}}]});
await build({entryPoints:['worker.js'],outfile:'dist/_worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
await writeFile('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
const files=(await walk(path.resolve('dist'))).map(p=>'/'+path.relative(path.resolve('dist'),p).replaceAll('\\','/'));
await writeFile('dist/precache.json',JSON.stringify(['/', '/styles.css','/icon.svg','/manifest.webmanifest',...files.filter(p=>p!='/sw.js'&&p!='/_worker.js')]));
const hash=createHash('sha256'); for(const f of files)hash.update(await readFile('dist'+f)); const version=hash.digest('hex').slice(0,12); await writeFile('dist/sw.js',(await readFile('public/sw.js','utf8')).replace('jus-cubing-v1','jus-cubing-'+version));
console.log('Built self-hosted app, scramble workers and puzzle assets.');
