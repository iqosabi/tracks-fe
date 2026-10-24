import {mkdir,copyFile,rm,cp,writeFile} from 'node:fs/promises';
import {publicConfigScript} from './public-config.mjs';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','src/app.js','src/auth.js','src/monitoring.js','src/style.css','src/redesign.css','src/maps.js','src/modules.js','src/management.js','src/presentation.js','src/workspace.css','src/data-table.js','src/controls.css'])await copyFile(file,'dist/'+file);
console.log('Static frontend built in dist/');
await writeFile('dist/runtime-config.js',await publicConfigScript());

for(const folder of ['assets','vendor'])await cp('src/'+folder,'dist/src/'+folder,{recursive:true});
