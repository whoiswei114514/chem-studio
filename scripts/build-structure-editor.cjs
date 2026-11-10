const fs = require('node:fs');
const path = require('node:path');
const [modules, output] = process.argv.slice(2);
const esbuild = require(path.join(modules, 'esbuild'));
const standalone = path.join(modules, 'ketcher-standalone/dist/binaryWasm');
fs.mkdirSync(output, {recursive: true});
const common = {
  bundle: true, minify: true, format: 'esm', target: 'chrome110',
  nodePaths: [modules], legalComments: 'eof',
  define: {'process.env.NODE_ENV': '"production"', 'process.env': '{}', global: 'globalThis'},
};
const bundle = esbuild.buildSync({
  ...common, entryPoints: [path.join(__dirname, '../src/structure-editor/editor.jsx')],
  outfile: path.join(output, 'editor.js'),
  alias: {'ketcher-standalone': path.join(standalone, 'main.js')},
  loader: {'.svg': 'dataurl', '.png': 'dataurl', '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl'},
  metafile: true,
});
// Keep Indigo's module-relative worker and WASM URLs valid in the offline bundle.
for (const filename of fs.readdirSync(standalone)) {
  if (/^indigoWorker-.*\.js$/.test(filename)) {
    esbuild.buildSync({...common, entryPoints: [path.join(standalone, filename)],
      outfile: path.join(output, filename)});
  } else if (filename.endsWith('.wasm')) {
    fs.copyFileSync(path.join(standalone, filename), path.join(output, filename));
  }
}
for (const filename of ['index.html', 'editor.css']) {
  fs.copyFileSync(path.join(__dirname, '../src/structure-editor', filename), path.join(output, filename));
}
fs.copyFileSync(path.join(modules, 'ketcher-react/dist/index.css'), path.join(output, 'ketcher.css'));
const packages = new Map(['ketcher-core', 'ketcher-react', 'ketcher-standalone', 'indigo-ketcher', 'react', 'react-dom']
  .map(name => [name, path.join(modules, name)]));
for (const input of Object.keys(bundle.metafile.inputs)) {
  if (!input.includes('node_modules')) continue;
  let directory = path.dirname(path.resolve(input));
  while (directory.includes('node_modules')) {
    const metadataPath = path.join(directory, 'package.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (metadata.name) { packages.set(metadata.name, directory); break; }
    }
    directory = path.dirname(directory);
  }
}
const provenance = [...packages.entries()].map(([name, directory]) => {
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const licenseFiles = fs.readdirSync(directory).filter(file => /^(LICENSE|NOTICE)(\.|$)/i.test(file));
  fs.mkdirSync(path.join(output, 'licenses', name), {recursive: true});
  for (const file of licenseFiles)
    fs.copyFileSync(path.join(directory, file), path.join(output, 'licenses', name, file));
  if (name.startsWith('ketcher-')) {
    for (const file of ['Ketcher-Apache-2.0.txt', 'Ketcher-NOTICE.txt']) {
      const input = path.join(__dirname, '../licenses', file);
      if (fs.existsSync(input)) {
        fs.copyFileSync(input, path.join(output, 'licenses', name, file));
        licenseFiles.push(file);
      }
    }
  }
  return {name, version: metadata.version, license: metadata.license, licenseFiles};
});
fs.writeFileSync(path.join(output, 'dependencies.json'), JSON.stringify(provenance, null, 2) + '\n');
console.log('Built offline chemical structure editor: ' + output);
