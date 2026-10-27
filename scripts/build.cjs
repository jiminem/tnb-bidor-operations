const fs = require('node:fs');
const path = require('node:path');
fs.mkdirSync('public', {recursive:true});
for (const name of ['index.html','crp.html','crp.js','dashboard-ui.js','shared-client.js','styles.css','images.png','Tenaga_Nasional.svg']) fs.copyFileSync(name,path.join('public',name));
fs.cpSync('vendor','public/vendor',{recursive:true});
