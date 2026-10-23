import sharp from 'sharp';
const names=[['akari','02_日本_明璃'],['haneul','03_韩国_苍穹'],['astra','04_美国_星隼'],['snega','05_俄罗斯_霜翼']];
for(const [id,folder]of names)await sharp(`reference_resources/${folder}/05_右侧朝左_高傲姿态游戏海报.png`).resize({width:1100,withoutEnlargement:true}).webp({quality:88}).toFile(`public/assets/roster/${id}-portrait.webp`);
