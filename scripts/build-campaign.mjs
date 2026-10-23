import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const blender=process.env.BLENDER_PATH||resolve('.tools/blender-5.2.3-windows-x64/blender.exe');
for(const [cmd,args] of [[blender,['--background','--python-exit-code','1','--python','scripts/author-campaign.py']],[process.execPath,['scripts/optimize-models.mjs','drone','interceptor','heavy','support','boss','prism','canopy','power','repair','building-residential','building-office','building-warehouse','tree-broadleaf','tree-pine','tree-coastal','turret','radar','missile-site']]]){const result=spawnSync(cmd,args,{stdio:'inherit',env:{...process.env,XDG_CACHE_HOME:resolve('.tools/cache')}});if(result.status!==0)process.exit(result.status||1);}
