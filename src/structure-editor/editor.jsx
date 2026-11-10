import React from 'react';
import {createRoot} from 'react-dom/client';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';

const post = data => window.chrome?.webview?.postMessage(data);
const provider = new StandaloneStructServiceProvider();
let ketcher, mute = false, revision = 0, hostRevision = 0, timer, serial = Promise.resolve();
let lastSnapshot = {};
const toolNames = {
  'Clear Canvas': '清空结构', 'Open...': '导入结构', 'Save as...': '另存结构',
  Undo: '撤销', Redo: '重做', Copy: '复制', Paste: '粘贴', Cut: '剪切',
  Aromatize: '芳香化', Dearomatize: '去芳香化', Layout: '自动排版', 'Clean Up': '整理键长与角度',
  'Calculate CIP': '计算 CIP 立体标记', 'Check Structure': '校验结构', 'Calculated Values': '分子性质',
  Settings: '设置', About: '关于编辑引擎', 'Fullscreen mode': '全屏',
  'Hand tool': '平移', 'Rectangle Selection': '框选', Erase: '删除',
  'Single Bond': '单键', 'Double Bond': '双键', 'Triple Bond': '三键', Chain: '碳链',
  'Charge Plus': '增加电荷', 'Charge Minus': '减少电荷', 'S-Group': '结构分组',
  'Reaction Plus Tool': '反应加号', 'Arrow Open Angle Tool': '反应箭头',
  'Add text': '添加文字', 'Add Image': '添加图片', 'Structure Library': '结构模板库',
  Benzene: '苯环', Cyclohexane: '六元环', Cyclopentane: '五元环', Cyclopropane: '三元环',
  Cyclobutane: '四元环', Cycloheptane: '七元环', Cyclooctane: '八元环', Cyclopentadiene: '环戊二烯',
  'Periodic Table': '元素周期表', Hydrogen: '氢', Carbon: '碳', Nitrogen: '氮', Oxygen: '氧',
  Sulfur: '硫', Phosphorus: '磷', Fluorine: '氟', Chlorine: '氯', Bromine: '溴', Iodine: '碘',
};
new MutationObserver(() => {
  for (const button of document.querySelectorAll('button[title]')) {
    const title = button.title;
    const split = title.indexOf(' (');
    const name = split < 0 ? title : title.slice(0, split);
    if (toolNames[name]) button.title = toolNames[name] + (split < 0 ? '' : title.slice(split));
  }
}).observe(document.getElementById('editor'), {subtree: true, childList: true, attributes: true, attributeFilter: ['title']});
const showError = message => {
  const panel = document.getElementById('error');
  panel.textContent = message;
  panel.hidden = !message;
};
async function structureSvg(ket) {
  const blob = await ketcher.generateImage(ket, {outputFormat: 'svg'});
  return blob.text();
}
async function snapshot(changed = true) {
  const current = revision;
  const epoch = hostRevision;
  let ket = '';
  try {
    ket = await ketcher.getKet();
    const reaction = ketcher.containsReaction();
    const empty = ketcher.editor.struct().atoms.size === 0;
    const mol = empty || reaction ? '' : await ketcher.getMolfile('v2000');
    const rxn = !empty && reaction ? await ketcher.getRxn('v2000') : '';
    const smiles = empty || reaction ? '' : await ketcher.getSmiles(true);
    const svg = empty ? '' : await structureSvg(ket);
    if (current !== revision || epoch !== hostRevision) return;
    lastSnapshot = {ket, mol, rxn, smiles, svg, empty, reaction};
    showError('');
    post({type: 'structure', ...lastSnapshot, revision: current, hostRevision: epoch, changed});
  } catch (error) {
    if (current !== revision || epoch !== hostRevision) return;
    const svg = ket ? await structureSvg(ket).catch(() => '') : '';
    lastSnapshot = {ket, mol: '', rxn: '', smiles: '', svg, error: String(error.message || error)};
    showError(lastSnapshot.error);
    post({type: 'structure', ...lastSnapshot, revision: current, hostRevision: epoch, changed});
  }
}
function changed() {
  if (mute) return;
  ++revision;
  clearTimeout(timer);
  post({type: 'structure-pending', revision, hostRevision});
  timer = setTimeout(() => { serial = serial.then(() => snapshot(true)); }, 120);
}
async function receive(message) {
  if (!ketcher) return;
  if (message.type === 'load-structure') {
    clearTimeout(timer);
    hostRevision = message.hostRevision;
    ++revision;
    mute = true;
    try {
      await ketcher.setMolecule(message.data || '');
      await snapshot(false);
    } finally { mute = false; }
  } else if (message.type === 'snapshot') {
    clearTimeout(timer);
    await snapshot(false);
  } else if (message.type === 'layout') {
    await ketcher.layout();
  } else if (message.type === 'clear-structure') {
    await ketcher.setMolecule('');
    changed();
    await snapshot(true);
  } else if (message.type === 'structure-stats') {
    post({type: 'structure-stats', atoms: ketcher.editor.struct().atoms.size,
      bonds: ketcher.editor.struct().bonds.size, snapshot: lastSnapshot});
  }
}
window.chemStructure = {receive: message => {
  serial = serial.then(() => receive(message)).catch(error => {
    showError(String(error.message || error));
    post({type: 'structure-error', message: String(error.message || error), hostRevision});
  });
  return serial;
}, snapshot: () => snapshot(false)};
window.chrome?.webview?.addEventListener('message', event => window.chemStructure.receive(event.data));
createRoot(document.getElementById('editor')).render(
  <Editor staticResourcesUrl="." structServiceProvider={provider} disableMacromoleculesEditor
    buttons={{miew: {hidden: true}, recognize: {hidden: true}, help: {hidden: true}, 'create-monomer': {hidden: true}}}
    errorHandler={message => { showError(message); }}
    onInit={instance => {
      ketcher = instance;
      window.ketcher = instance;
      instance.editor.subscribe('change', changed);
      post({type: 'ready', engine: 'Ketcher 3.18.0 / Indigo 1.46.0', offline: true});
    }}/>
);
window.addEventListener('error', event => {
  showError(event.message);
  post({type: 'structure-error', message: event.message, hostRevision});
});
window.addEventListener('unhandledrejection', event => {
  const message = String(event.reason?.message || event.reason);
  showError(message);
  post({type: 'structure-error', message, hostRevision});
});
