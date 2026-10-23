import {existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve('.'),blender=process.env.BLENDER_PATH||resolve('.tools/blender-5.2.3-windows-x64/blender.exe');
if(!existsSync(blender))throw Error('Set BLENDER_PATH to Blender 5.2 LTS, or extract its portable ZIP into .tools/blender-5.2.3-windows-x64.');
mkdirSync('.tools/cache',{recursive:true});
function run(command,args){const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,XDG_CACHE_HOME:resolve('.tools/cache')}});if(result.status!==0)process.exit(result.status||1);}
run(process.env.PYTHON_PATH||'python',['scripts/author-textures.py']);
run(process.execPath,['scripts/prepare-roster-references.mjs']);
run(process.execPath,['scripts/prepare-pilot-portraits.mjs']);
if(!process.argv.includes('--roster'))run(blender,['--background','--python-exit-code','1','--python','scripts/author-models.py']);
run(blender,['--background','--python-exit-code','1','--python','scripts/author-roster.py']);
run(process.execPath,['scripts/optimize-models.mjs',...(process.argv.includes('--roster')?['akari','haneul','astra','snega']:[])]);
