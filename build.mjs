import {mkdir,copyFile,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','src/app.js','src/auth.js','src/monitoring.js','src/style.css'])await copyFile(file,'dist/'+file);
console.log('Static frontend built in dist/');
