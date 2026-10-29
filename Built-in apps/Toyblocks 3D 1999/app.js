const sceneHost = document.querySelector('#scene');
const selectedName = document.querySelector('#selectedName');
const toolButtons = [...document.querySelectorAll('.tool')];

const GRID_SIZE = 64;
const WIDTH = 480;
const HEIGHT = 360;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x006eff);

const camera = new THREE.PerspectiveCamera(56, WIDTH / HEIGHT, 0.1, 180);
camera.position.set(10, 7, 16);

let yaw = -0.55;
let pitch = -0.3;
let selectedShape = 'cube';
const pressed = new Set();
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputEncoding = THREE.sRGBEncoding;
sceneHost.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
keyLight.position.set(-8, 16, 10);
scene.add(keyLight);

const grid = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0xffffff, 0x555555);
scene.add(grid);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

const egaPalette = [
  [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
  [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
  [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
  [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255],
];

function quantizeChannel(r, g, b) {
  let closest = egaPalette[0];
  let bestDistance = Infinity;
  for (const color of egaPalette) {
    const distance = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = color;
    }
  }
  return closest;
}

function loadPixelTexture(path, repeat = 1, offset = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.offset.set(offset, offset);

  const image = new Image();
  image.addEventListener('load', () => {
    context.drawImage(image, 0, 0, 128, 128);
    const imageData = context.getImageData(0, 0, 128, 128);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const color = quantizeChannel(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      imageData.data[i] = color[0];
      imageData.data[i + 1] = color[1];
      imageData.data[i + 2] = color[2];
    }
    context.putImageData(imageData, 0, 0);
    texture.needsUpdate = true;
  });
  image.src = path;
  return texture;
}

const axisTextures = {
  x: loadPixelTexture('x.png'),
  y: loadPixelTexture('y.png'),
  z: loadPixelTexture('z.png'),
};

const cubeMaterials = [
  new THREE.MeshBasicMaterial({ map: axisTextures.x }),
  new THREE.MeshBasicMaterial({ map: axisTextures.x }),
  new THREE.MeshBasicMaterial({ map: axisTextures.y }),
  new THREE.MeshBasicMaterial({ map: axisTextures.y }),
  new THREE.MeshBasicMaterial({ map: axisTextures.z }),
  new THREE.MeshBasicMaterial({ map: axisTextures.z }),
];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const placedObjects = [];

function updateCameraDirection() {
  pitch = THREE.MathUtils.clamp(pitch, -1.25, 1.1);
  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(camera.position.clone().add(direction));
}

function buildObject(shape) {
  if (shape === 'cube') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMaterials);
    mesh.userData.height = 1;
    return mesh;
  }

  if (shape === 'sphere') {
    const geometry = new THREE.SphereGeometry(0.5, 8, 6);
    geometry.clearGroups();
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i);
      const b = indices.getX(i + 1);
      const c = indices.getX(i + 2);
      const x = Math.abs((positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3);
      const y = Math.abs((positions.getY(a) + positions.getY(b) + positions.getY(c)) / 3);
      const z = Math.abs((positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3);
      const materialIndex = x >= y && x >= z ? 0 : y >= z ? 1 : 2;
      geometry.addGroup(i, 3, materialIndex);
    }
    const mesh = new THREE.Mesh(
      geometry,
      [
        new THREE.MeshBasicMaterial({ map: axisTextures.x }),
        new THREE.MeshBasicMaterial({ map: axisTextures.y }),
        new THREE.MeshBasicMaterial({ map: axisTextures.z }),
      ]
    );
    mesh.userData.height = 1;
    return mesh;
  }

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.height = 0;
  return mesh;
}

function setPointer(event) {
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function placeObject(event) {
  setPointer(event);
  const hit = raycaster.intersectObjects([ground, ...placedObjects], false)[0];
  if (!hit) return;

  const object = buildObject(selectedShape);
  const target = hit.object === ground ? null : hit.object;
  const cellX = THREE.MathUtils.clamp(Math.floor(hit.point.x) + 0.5, -31.5, 31.5);
  const cellZ = THREE.MathUtils.clamp(Math.floor(hit.point.z) + 0.5, -31.5, 31.5);
  const baseY = target ? target.userData.topY : 0;
  const height = object.userData.height;

  object.position.x = selectedShape === 'platform' ? Math.round(hit.point.x) : cellX;
  object.position.z = selectedShape === 'platform' ? Math.round(hit.point.z) : cellZ;
  object.position.y = baseY + (height === 0 ? 0.03 : height / 2);
  object.userData.topY = baseY + (height === 0 ? 0.03 : height);
  scene.add(object);
  placedObjects.push(object);
}

function deleteObject(event) {
  event.preventDefault();
  setPointer(event);
  const hit = raycaster.intersectObjects(placedObjects, false)[0];
  if (!hit) return;
  const index = placedObjects.indexOf(hit.object);
  if (index !== -1) placedObjects.splice(index, 1);
  scene.remove(hit.object);
}

function updateMovement(delta) {
  const turnSpeed = 1.65 * delta;
  if (pressed.has('ArrowLeft')) yaw -= turnSpeed;
  if (pressed.has('ArrowRight')) yaw += turnSpeed;
  if (pressed.has('ArrowUp')) pitch += turnSpeed;
  if (pressed.has('ArrowDown')) pitch -= turnSpeed;

  const moveSpeed = 8 * delta;
  const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  if (pressed.has('KeyW')) camera.position.addScaledVector(forward, moveSpeed);
  if (pressed.has('KeyS')) camera.position.addScaledVector(forward, -moveSpeed);
  if (pressed.has('KeyA')) camera.position.addScaledVector(right, -moveSpeed);
  if (pressed.has('KeyD')) camera.position.addScaledVector(right, moveSpeed);
  if (pressed.has('KeyQ')) camera.position.y -= moveSpeed;
  if (pressed.has('KeyE')) camera.position.y += moveSpeed;

  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -31, 31);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -31, 31);
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.6, 48);
  updateCameraDirection();
}

toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedShape = button.dataset.shape;
    selectedName.textContent = selectedShape.toUpperCase();
    toolButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-pressed', String(active));
    });
  });
});

const controlCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'];
window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyF' && !event.repeat) {
    event.preventDefault();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    return;
  }
  if (event.code.startsWith('Arrow') || controlCodes.includes(event.code)) {
    event.preventDefault();
    pressed.add(event.code);
  }
});

window.addEventListener('keyup', (event) => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());
function updateGameScale() {
  const scale = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  document.querySelector('.game').style.setProperty('--game-scale', String(scale));
}

window.addEventListener('resize', updateGameScale);

sceneHost.addEventListener('click', placeObject);
sceneHost.addEventListener('contextmenu', deleteObject);
updateCameraDirection();
updateGameScale();

renderer.setAnimationLoop(() => {
  updateMovement(Math.min(clock.getDelta(), 0.05));
  renderer.render(scene, camera);
});
