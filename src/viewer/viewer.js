import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const colors = { 1:0xf1f3f5, 6:0x454d56, 7:0x3b6edd, 8:0xe44848, 9:0x55b989, 15:0xe7a13e, 16:0xe0c34d, 17:0x52ac68, 35:0x9a4b37, 53:0x8562ba };
const radii = { 1:1.2, 6:1.7, 7:1.55, 8:1.52, 9:1.47, 15:1.8, 16:1.8, 17:1.75, 35:1.85, 53:1.98 };
const symbols = { 1:'H', 6:'C', 7:'N', 8:'O', 9:'F', 15:'P', 16:'S', 17:'Cl', 35:'Br', 53:'I' };
const post = value => window.chrome?.webview?.postMessage(value);
let renderer, scene, camera, controls, moleculeGroup;
let model = { atoms:[], bonds:[] }, mode = 'ball-stick', hydrogens = true, rotating = false, suspended = false;
let selected = -1, meshes = [], frameCount = 0, radius = 4, lastFrame = 0;
const geometry = new THREE.SphereGeometry(1, 28, 18);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const up = new THREE.Vector3(0, 1, 0);

function material(number) {
  return new THREE.MeshStandardMaterial({ color:colors[number] ?? 0xc685a3, roughness:0.4, metalness:0.08 });
}
function clearGroup() {
  for (const mesh of moleculeGroup.children) mesh.material?.dispose();
  moleculeGroup.clear();
  meshes = [];
}
function rebuild() {
  clearGroup();
  const points = model.atoms.map(a => new THREE.Vector3(a.x, a.y, a.z));
  const box = new THREE.Box3().setFromPoints(points);
  const center = points.length ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
  const visible = i => hydrogens || model.atoms[i].element !== 1;
  points.forEach(p => p.sub(center));
  for (let i = 0; i < model.atoms.length; i++) {
    if (!visible(i)) continue;
    const atom = model.atoms[i];
    const mesh = new THREE.Mesh(geometry, material(atom.element));
    const size = mode === 'space-fill' ? (radii[atom.element] ?? 1.7) : mode === 'stick' ? 0.16 : atom.element === 1 ? 0.22 : 0.37;
    mesh.scale.setScalar(size);
    mesh.position.copy(points[i]);
    mesh.userData.index = i;
    if (i === selected) mesh.material.emissive.setHex(0x306f54);
    moleculeGroup.add(mesh);
    meshes.push(mesh);
  }
  if (mode !== 'space-fill') {
    for (const bond of model.bonds) {
      if (!visible(bond.from) || !visible(bond.to)) continue;
      const start = points[bond.from], end = points[bond.to];
      const direction = end.clone().sub(start);
      const perpendicular = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0,0,1));
      if (perpendicular.lengthSq() < 0.01) perpendicular.crossVectors(direction, new THREE.Vector3(0,1,0));
      perpendicular.normalize().multiplyScalar(0.19);
      const count = Math.max(1, Math.min(3, bond.order));
      for (let j = 0; j < count; j++) {
        const shift = perpendicular.clone().multiplyScalar(j - (count - 1) / 2);
        const a = start.clone().add(shift), b = end.clone().add(shift), middle = a.clone().lerp(b, 0.5);
        for (const [p,q,element] of [[a,middle,model.atoms[bond.from].element],[middle,b,model.atoms[bond.to].element]]) {
          const mesh = new THREE.Mesh(cylinder, material(element));
          const delta = q.clone().sub(p);
          mesh.position.copy(p).lerp(q, 0.5);
          mesh.quaternion.setFromUnitVectors(up, delta.clone().normalize());
          mesh.scale.set(mode === 'stick' ? 0.14 : 0.085, delta.length(), mode === 'stick' ? 0.14 : 0.085);
          moleculeGroup.add(mesh);
        }
      }
    }
  }
  radius = Math.max(2, ...points.map(p => p.length() + 1.8));
  render();
}
function fit() {
  const limitingFov = Math.min(camera.fov * Math.PI / 180, 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
  const distance = radius / Math.sin(limitingFov / 2) * 1.1;
  camera.position.set(0.22,0.16,1).normalize().multiplyScalar(distance);
  controls.target.set(0,0,0);
  controls.minDistance = radius * 0.45;
  controls.maxDistance = distance * 5;
  camera.near = 0.05;
  camera.far = Math.max(1000, distance * 10);
  camera.updateProjectionMatrix();
  controls.update();
  render();
}
function resize() {
  const width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  render();
}
function render() { renderer?.render(scene, camera); }
function stats() {
  render();
  const gl = renderer.getContext();
  const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
  gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let coloredPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) if (Math.min(pixels[i], pixels[i+1], pixels[i+2]) < 190) coloredPixels++;
  return { atoms:model.atoms.length, visibleAtoms:meshes.length, bonds:model.bonds.length, coloredPixels, width:gl.drawingBufferWidth, height:gl.drawingBufferHeight, frameCount, mode, rotating, camera:camera.position.toArray(), selected };
}
function receive(message) {
  switch (message.type) {
    case 'molecule':
      model = message.data;
      selected = -1;
      document.getElementById('selection').textContent = '';
      rebuild(); fit(); post({ type:'scene', ...stats() }); break;
    case 'representation': mode = message.value; rebuild(); break;
    case 'hydrogens': hydrogens = Boolean(message.value); rebuild(); break;
    case 'rotate': rotating = Boolean(message.value); controls.autoRotate = rotating; break;
    case 'suspend': suspended = Boolean(message.value); break;
    case 'fit': fit(); break;
    case 'zoom': camera.position.sub(controls.target).multiplyScalar(message.value).add(controls.target); controls.update(); render(); break;
    case 'export': render(); post({ type:'image', png:renderer.domElement.toDataURL('image/png'), ...stats() }); break;
    case 'stats': post({ type:'stats', ...stats() }); break;
  }
}
try {
  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, preserveDrawingBuffer:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf7f8fa);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '\u4e09\u7ef4\u5206\u5b50');
  renderer.domElement.setAttribute('tabindex', '0');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.05, 1000);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotateSpeed = 1.2;
  controls.addEventListener('change', render);
  moleculeGroup = new THREE.Group();
  scene.add(moleculeGroup, new THREE.HemisphereLight(0xffffff, 0x6b7585, 2.7));
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(4,7,8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd8eaff, 1.5);
  rim.position.set(-6,-2,-4); scene.add(rim);
  let down;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX,e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX-down[0],e.clientY-down[1]) > 5) return;
    pointer.set(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes)[0];
    selected = hit ? hit.object.userData.index : -1;
    const a = model.atoms[selected];
    document.getElementById('selection').textContent = a ? `${symbols[a.element] ?? a.element}  #${selected+1}    (${a.x.toFixed(3)}, ${a.y.toFixed(3)}, ${a.z.toFixed(3)}) \u00c5` : '';
    rebuild(); post({ type:'selection', index:selected });
  });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); post({type:'error',message:'WebGL context lost'}); });
  addEventListener('resize', resize);
  window.chrome?.webview?.addEventListener('message', e => receive(e.data));
  window.chemViewer = { receive, stats, png:() => {render(); return renderer.domElement.toDataURL('image/png');}, atomScreen:index => {const p=meshes.find(m=>m.userData.index===index)?.position.clone().project(camera); return p ? {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}:null;} };
  resize(); fit();
  renderer.setAnimationLoop(time => {
    if (suspended || document.hidden) return;
    if (time - lastFrame < 30) return;
    const delta = lastFrame ? Math.min(0.1, (time-lastFrame)/1000) : 0.03;
    lastFrame = time;
    controls.update(delta); frameCount++;
    if (rotating) render();
  });
  post({ type:'ready' });
} catch (error) {
  const text = `WebGL: ${error.message}`;
  const node = document.getElementById('error'); node.hidden = false; node.textContent = text;
  post({ type:'error', message:text });
}
