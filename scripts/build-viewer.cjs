const path = require('node:path');
const fs = require('node:fs');
const [modules, output] = process.argv.slice(2);
const esbuild = require(path.join(modules, 'esbuild'));
fs.mkdirSync(output, { recursive:true });
esbuild.buildSync({
  entryPoints:[path.join(__dirname, '../src/viewer/viewer.js')],
  outfile:path.join(output, 'viewer.js'), bundle:true, minify:true, format:'iife',
  target:'chrome110', nodePaths:[modules], legalComments:'eof'
});
fs.copyFileSync(path.join(__dirname, '../src/viewer/index.html'), path.join(output, 'index.html'));
