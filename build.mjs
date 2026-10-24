import {mkdir,copyFile,rm,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','src/app.js','src/auth.js','src/monitoring.js','src/style.css','src/redesign.css','src/maps.js'])await copyFile(file,'dist/'+file);
console.log('Static frontend built in dist/');

for(const folder of ['assets','vendor'])await cp('src/'+folder,'dist/src/'+folder,{recursive:true});
