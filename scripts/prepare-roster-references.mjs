import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
const ids=['qingluan','akari','haneul','astra','snega'];
const folders=['01_中国_青鸾','02_日本_明璃','03_韩国_苍穹','04_美国_星隼','05_俄罗斯_霜翼'];
await mkdir('public/assets/roster',{recursive:true});
for(let i=0;i<ids.length;i++)await sharp(`reference_resources/${folders[i]}/02_战机三视图.png`).resize({width:1800,withoutEnlargement:true}).webp({quality:88}).toFile(`public/assets/roster/${ids[i]}-reference.webp`);
