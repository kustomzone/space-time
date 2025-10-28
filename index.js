import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const sunGroup = new THREE.Group();
scene.add(sunGroup);
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 115;
camera.position.x = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);
new OrbitControls(camera, renderer.domElement);
const detail = 12;
const loader = new THREE.TextureLoader();
const geometry = new THREE.IcosahedronGeometry(1, detail);
const material = new THREE.MeshPhongMaterial({
  map: loader.load("./space/00_earthmap1k.jpg"),
  specularMap: loader.load("./space/02_earthspec1k.jpg"),
  bumpMap: loader.load("./space/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
material.map.colorSpace = THREE.SRGBColorSpace;
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./space/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./space/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./space/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const starObjs = [];

const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(-2, 0.1, 0.5);
scene.add(sunLight);

const sunRadius = 1.2;
const sunGeometry = new THREE.SphereGeometry(sunRadius, 64, 64);
const sunSurfaceMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, blending: THREE.AdditiveBlending });
const sunMesh = new THREE.Mesh(sunGeometry, sunSurfaceMat);
sunMesh.position.set(-20, 0.5, -2);
sunGroup.add(sunMesh);

const fresnelMatSunGlow = getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 });
const scales = [1.0, 1.02, 1.05, 1.1, 1.2, 1.4, 1.6];

for (const scale of scales) {
  const glow = new THREE.Mesh(sunGeometry, fresnelMatSunGlow);
  glow.scale.setScalar(scale);
  glow.position.copy(sunMesh.position);
  sunGroup.add(glow);
}

const sunPointLight = new THREE.PointLight(0xffeecc, 6, 200, 2);
sunPointLight.position.copy(sunMesh.position);
scene.add(sunPointLight);

let moonPivot = null;
let moonMesh = null;
let moonVisible = true;
moonPivot = new THREE.Object3D();
moonPivot.name = 'moonPivot';
moonPivot.visible = moonVisible;
earthGroup.add(moonPivot);

loader.load('./space/moonmap1k.jpg', (moonTex) => {
  try { moonTex.colorSpace = THREE.SRGBColorSpace; } catch (e) { }
  loader.load('./space/moonbump1k.jpg', (bumpTex) => {
    try { bumpTex.colorSpace = THREE.SRGBColorSpace; } catch (e) { }
    const moonGeo = new THREE.SphereGeometry(0.27, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTex, bumpMap: bumpTex, bumpScale: 0.02 });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(3.2, 0.2, 0);
    moonMesh.name = 'moonMesh';
    moonMesh.visible = moonVisible;
    moonPivot.add(moonMesh);
  }, undefined, (err) => {
    console.warn('Moon bump map missing or failed to load:', err);
    const moonGeo = new THREE.SphereGeometry(0.27, 32, 32);
    const moonMat = new THREE.MeshStandardMaterial({ map: moonTex });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(3.2, 0.2, 0);
    moonMesh.name = 'moonMesh';
    moonMesh.visible = moonVisible;
    moonPivot.add(moonMesh);
  });
}, undefined, (err) => {
  console.warn('Moon texture not found or failed to load:', err);
});

function getFresnelMat({ rimHex = 0x0088ff, facingHex = 0x000000 } = {}) {
  const uniforms = {
    color1: { value: new THREE.Color(rimHex) },
    color2: { value: new THREE.Color(facingHex) },
    fresnelBias: { value: 0.1 },
    fresnelScale: { value: 1.0 },
    fresnelPower: { value: 4.0 },
  };
  const vs = `
  uniform float fresnelBias;
  uniform float fresnelScale;
  uniform float fresnelPower;
  varying float vReflectionFactor;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
    vec3 I = worldPosition.xyz - cameraPosition;
    vReflectionFactor = fresnelBias + fresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), fresnelPower );
    gl_Position = projectionMatrix * mvPosition;
  }
  `;
  const fs = `
  uniform vec3 color1;
  uniform vec3 color2;
  varying float vReflectionFactor;
  
  void main() {
    float f = clamp( vReflectionFactor, 0.0, 1.0 );
    gl_FragColor = vec4(mix(color2, color1, vec3(f)), f);
  }
  `;
  const fresnelMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vs,
    fragmentShader: fs,
    transparent: true,
    blending: THREE.AdditiveBlending,
    wireframe: false,
  });
  return fresnelMat;
}

function containsInvalidNumber(arr) {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) return true;
  }
  return false;
}

function sanitizeArrayInPlace(arr) {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (!Number.isFinite(v)) arr[i] = 0;
  }
}

function getStarfield({ numStars = 500 } = {}) {
  function randomSpherePoint() {
    const radius = Math.random() * 25 + 25;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);

    return {
      pos: new THREE.Vector3(x, y, z),
      hue: 0.6,
      minDist: radius,
    };
  }
  const verts = [];
  const colors = [];
  const positions = [];
  let col;
  for (let i = 0; i < numStars; i += 1) {
    let p = randomSpherePoint();
    const { pos, hue } = p;
    positions.push(p);
    col = new THREE.Color().setHSL(hue, 0.2, Math.random());
    verts.push(pos.x, pos.y, pos.z);
    colors.push(col.r, col.g, col.b);
  }
  const geo = new THREE.BufferGeometry();
  if (containsInvalidNumber(verts) || containsInvalidNumber(colors)) {
    console.warn('getStarfield: detected invalid number in verts/colors; sanitizing');
    sanitizeArrayInPlace(verts);
    sanitizeArrayInPlace(colors);
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const textureInfos = [
    { path: "./space/stars/white-star.png", weight: 6000, size: 0.26 },
    { path: "./space/stars/yellow-dwarf.png", weight: 10, size: 0.52 },
    { path: "./space/stars/red-dwarf.png", weight: 8, size: 0.52 },
    { path: "./space/stars/blue-dwarf.png", weight: 6, size: 0.54 },
    { path: "./space/stars/cyan-dwarf.png", weight: 4, size: 0.54 },
    { path: "./space/stars/green-dwarf.png", weight: 3, size: 0.56 },
    { path: "./space/stars/purple-dwarf.png", weight: 2, size: 0.56 },
    { path: "./space/stars/black-dwarf.png", weight: 1, size: 0.58 },
  ];

  const textures = textureInfos.map((ti) => loader.load(ti.path, (tex) => { try { tex.colorSpace = THREE.SRGBColorSpace; } catch (e) { } }));
  const buckets = textureInfos.map(() => ({ verts: [], colors: [] }));
  const cumulative = [];
  let totalWeight = 0;
  for (let i = 0; i < textureInfos.length; i++) {
    totalWeight += textureInfos[i].weight;
    cumulative.push(totalWeight);
  }

  function pickTextureIndex() {
    const r = Math.random() * totalWeight;
    for (let i = 0; i < cumulative.length; i++) {
      if (r < cumulative[i]) return i;
    }
    return cumulative.length - 1;
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const texIdx = pickTextureIndex();
    buckets[texIdx].verts.push(p.pos.x, p.pos.y, p.pos.z);
    const ci = i * 3;
    buckets[texIdx].colors.push(colors[ci], colors[ci + 1], colors[ci + 2]);
  }

  const group = new THREE.Group();
  for (let i = 0; i < textures.length; i++) {
    const b = buckets[i];
    if (b.verts.length === 0) continue;
    const g = new THREE.BufferGeometry();
    if (containsInvalidNumber(b.verts) || containsInvalidNumber(b.colors)) {
      console.warn('getStarfield: detected invalid number in bucket verts/colors; sanitizing (bucket index', i, ')');
      sanitizeArrayInPlace(b.verts);
      sanitizeArrayInPlace(b.colors);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(b.verts, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(b.colors, 3));
    const baseSize = textureInfos[i].size || 0.2;
    const mat = new THREE.PointsMaterial({
      size: baseSize,
      sizeAttenuation: true,
      vertexColors: true,
      map: textures[i],
      transparent: true,
      alphaTest: 0.01,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    mat.size *= (0.9 + Math.random() * 0.3);
    const pts = new THREE.Points(g, mat);
    group.add(pts);
  }
  return group;
}

let speed = 0.0005;
let speed2 = 0.00005;
let speed3 = 0.01;
let timeTravel = true;
let currentYear = new Date().getFullYear();
const newLabel = document.createElement('div');
newLabel.style = 'color: white; font-weight: bold; position: absolute; z-index: 10; top: 15px; left: 0; right: 0; margin: auto; width: fit-content;'
newLabel.textContent = currentYear.toFixed(2);
document.body.append(newLabel);
const loadingText = document.createElement('div');
loadingText.id = 'loading-sim';
loadingText.textContent = 'Loading Simulation';
const _style = document.createElement('style');
_style.textContent = `
@keyframes loadingBlink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.08; } }
@keyframes loadingGlow { 0% { text-shadow: 0 0 6px rgba(255,255,255,0.9); } 50% { text-shadow: 0 0 18px rgba(255,255,255,1); } 100% { text-shadow: 0 0 6px rgba(255,255,255,0.9); } }
#loading-sim {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 24px;
  margin: auto;
  width: fit-content;
  color: white;
  font-weight: 700;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 18px;
  z-index: 9999;
  pointer-events: none;
  -webkit-user-select: none;
  user-select: none;
  animation: loadingBlink 1.2s linear infinite, loadingGlow 1.8s ease-in-out infinite;
  transition: opacity 0.6s ease, transform 0.6s ease;
}
`;
let _loadingDots = 0;
let loadingDotsInterval;
let didTimeBroke = false;
let timeOffset = 1300;
let speed1Bkp;
let speed2Bkp;
let speed3Bkp;
let countBkp;
let timeSpeed = 0.001;
const clock = new THREE.Clock();
let didLoad = false;
const stars = getStarfield({ numStars: 2000 });
scene.add(stars);
starObjs.push(stars);
window.onclick = () => {
  if (didLoad) return;
  didLoad = true;
  const bgaudio = new Audio("./sounds/sci-fi-ambience-soothing-spaceship-engine-sound-loop-296976.mp3");
  bgaudio.volume = 0.0;
  const targetVolume = 0.6;
  const fadeDuration = 25000;
  const steps = 50;
  const stepTime = fadeDuration / steps;
  const volumeIncrement = (targetVolume - bgaudio.volume) / steps;
  const fadeInterval = setInterval(() => {
    bgaudio.volume = Math.min(bgaudio.volume + volumeIncrement, targetVolume);
    if (bgaudio.volume >= targetVolume) clearInterval(fadeInterval);
  }, stepTime);
  bgaudio.play();
  const audio = new Audio("./sounds/sci-fi-disappearance-96144.mp3");
  audio.volume = 0.8;
  audio.currentTime = 4;
  audio.play();
  document.head.appendChild(_style);
  document.body.appendChild(loadingText);
  loadingDotsInterval = setInterval(() => {
    _loadingDots = (_loadingDots + 1) % 4;
    loadingText.textContent = 'Loading Simulation' + '.'.repeat(_loadingDots);
  }, 450);
  setInterval(() => {
    const stars = getStarfield({ numStars: 1000 / 8 });
    scene.add(stars);
    starObjs.push(stars);
  }, 1000 / 8);
  let glitchAudio;
  setTimeout(() => {
    const bg2audio = new Audio("./sounds/low-engine-hum-72529.mp3");
    bg2audio.volume = 0.5;
    bg2audio.play();
    didTimeBroke = true;
    glitchAudio = new Audio("./sounds/glitch-sound-effect-426400.mp3");
    glitchAudio.volume = 0.4;
    glitchAudio.play();
    const audio = new Audio("./sounds/deep-space-ambiance-48854.mp3");
    audio.volume = 0.8;
    audio.play();
  }, 3000 + timeOffset);
  setTimeout(() => {
    glitchAudio.pause();
    const audio = new Audio("./sounds/warp-magic-5-382388.mp3");
    audio.currentTime = (Math.random() * 1) + 0.1;
    audio.volume = 0.5;
    audio.play();
    didTimeBroke = false;
    const duration = 1000;
    const startTime = performance.now();
    speed1Bkp = speed;
    speed2Bkp = speed2;
    speed3Bkp = speed3;
    countBkp = count;
    const start = {
      speed: speed,
      speed2: speed2,
      speed3: speed3,
      count: count
    };
    const target = {
      speed: 0.0005,
      speed2: 0.00005,
      speed3: 0.01,
      count: 20
    };
    function smoothStep(x) {
      return x * x * (3 - 2 * x);
    }
    function animate(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = smoothStep(t);
      speed = start.speed + (target.speed - start.speed) * eased;
      speed2 = start.speed2 + (target.speed2 - start.speed2) * eased;
      speed3 = start.speed3 + (target.speed3 - start.speed3) * eased;
      count = start.count + (target.count - start.count) * eased;
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        speed = target.speed;
        speed2 = target.speed2;
        speed3 = target.speed3;
        count = target.count;
      }
    }
    requestAnimationFrame(animate);
  }, 13596 + timeOffset);
  setTimeout(() => {
    speed = speed1Bkp;
    speed2 = speed2Bkp;
    speed3 = speed3Bkp;
    count = countBkp;
    didTimeBroke = true;
    timeTravel = false;
    glitchAudio = new Audio("./sounds/glitch-sound-effect-426400.mp3");
    glitchAudio.currentTime = Math.floor(Math.random() * 5) + 0;
    glitchAudio.volume = 0.4;
    glitchAudio.play();
  }, 25000 + timeOffset);
  let isFirst = true;
  setTimeout(() => {
    if (isFirst) {
      isFirst = false;
      const finalaudio = new Audio("./sounds/room-noise-58390.mp3");
      finalaudio.volume = 0.0;
      const targetVolume = 0.8;
      const fadeDuration = 15000;
      const steps = 50;
      const stepTime = fadeDuration / steps;
      const volumeIncrement = (targetVolume - finalaudio.volume) / steps;
      const fadeInterval = setInterval(() => {
        finalaudio.volume = Math.min(finalaudio.volume + volumeIncrement, targetVolume);
        if (finalaudio.volume >= targetVolume) clearInterval(fadeInterval);
      }, stepTime);
    }
    const bg2audio = new Audio("./sounds/low-engine-hum-72529.mp3");
    bg2audio.volume = 0.5;
    bg2audio.play();
    timeTravel = !timeTravel;
    const audio = new Audio("./sounds/warp-magic-5-382388.mp3");
    audio.currentTime = (Math.random() * 1) + 0.1;
    audio.volume = (Math.random() * 1) + 0.1;
    audio.play();
    glitchAudio = new Audio("./sounds/glitch-sound-effect-426400.mp3");
    glitchAudio.currentTime = Math.floor(Math.random() * 5) + 0;
    glitchAudio.volume = (Math.random() * 1) + 0.1;
    glitchAudio.play();
  }, 60000 + timeOffset);
}

const explosions = [];
const shockwaves = [];
let _frameCounter = 0;

function scanSceneForInvalidPositions() {
  scene.traverse((obj) => {
    try {
      if (obj && obj.geometry && obj.geometry.attributes && obj.geometry.attributes.position) {
        const attr = obj.geometry.attributes.position;
        if (attr && attr.array && containsInvalidNumber(attr.array)) {
          console.warn('scanSceneForInvalidPositions: found invalid numbers in geometry', {
            name: obj.name || '(no-name)',
            type: obj.type,
            uuid: obj.geometry.uuid,
          });
          sanitizeArrayInPlace(attr.array);
          try { attr.needsUpdate = true; } catch (e) { }
        }
      }
    } catch (e) {
      console.error('Error while scanning geometry for invalid positions', e);
    }
  });
}

let count = 20;
function createExplosion(pos) {
  const n = Math.max(1, Math.min(1000, Math.floor(Number(count) || 0)));
  const positions = new Float32Array(n * 3);
  const velocities = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let rx = (Math.random() - 0.5);
    let ry = (Math.random() - 0.5);
    let rz = (Math.random() - 0.5);
    let lenSq = rx * rx + ry * ry + rz * rz;
    if (lenSq === 0 || !Number.isFinite(lenSq)) {
      rx = 1; ry = 0; rz = 0; lenSq = 1;
    }
    const invLen = 1 / Math.sqrt(lenSq);
    const vx = rx * invLen;
    const vy = ry * invLen;
    const vz = rz * invLen;
    const r = Math.random() * 1.6;
    positions[3 * i + 0] = pos.x + vx * 0.1;
    positions[3 * i + 1] = pos.y + vy * 0.1;
    positions[3 * i + 2] = pos.z + vz * 0.1;
    velocities[3 * i + 0] = vx * r * (6 + Math.random() * 8);
    velocities[3 * i + 1] = vy * r * (6 + Math.random() * 8);
    velocities[3 * i + 2] = vz * r * (6 + Math.random() * 8);
  }
  if (containsInvalidNumber(positions) || containsInvalidNumber(velocities)) {
    console.warn('createExplosion: invalid number detected in positions/velocities; sanitizing');
    sanitizeArrayInPlace(positions);
    sanitizeArrayInPlace(velocities);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 0.06, color: 0xffcc66, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  explosions.push({ pts, velocities, birth: 0, life: 4.6, geo });
  const swGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const swMat = new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
  const sw = new THREE.Mesh(swGeo, swMat);
  sw.position.copy(pos);
  scene.add(sw);
  shockwaves.push({ mesh: sw, birth: 0, life: 10.6 });
  const flash = new THREE.PointLight(0xffeecc, 30, 60, 2);
  flash.position.copy(pos);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 300);
}

createExplosion(sunMesh.position.clone());
setInterval(() => {
  createExplosion(sunMesh.position.clone());
}, 1000 / 3);

function animate() {
  requestAnimationFrame(animate);

  if (didLoad) {
    const dt = clock.getDelta();
    if (timeTravel) {
      if (didTimeBroke) {
        speed += 0.0001;
        speed2 += 0.00001;
        currentYear += timeSpeed;
        timeSpeed += 0.00001;
        speed3 += 0.001;
        count += speed3;
      }
      earthMesh.rotation.y -= speed;
      lightsMesh.rotation.y -= speed;
      cloudsMesh.rotation.y += speed;
      glowMesh.rotation.y -= speed;
      sunMesh.rotation.y -= speed;
      earthGroup.rotation.z += speed;
      for (const stars of starObjs) {
        stars.rotation.y += speed2;
      }
      if (moonPivot) {
        moonPivot.rotation.y += speed * 5;
      }
      if (moonMesh) {
        moonMesh.rotation.y += speed * 10;
      }
    } else {
      if (didTimeBroke) {
        speed -= 0.0001;
        speed2 -= 0.00001;
        currentYear -= timeSpeed;
        timeSpeed -= 0.00001;
        speed3 -= 0.001;
        count -= speed3;
      }
      earthMesh.rotation.y += speed;
      lightsMesh.rotation.y += speed;
      cloudsMesh.rotation.y -= speed;
      glowMesh.rotation.y += speed;
      sunMesh.rotation.y += speed;
      earthGroup.rotation.z -= speed;
      for (const stars of starObjs) {
        stars.rotation.y -= speed2;
      }
      if (moonPivot) {
        moonPivot.rotation.y -= speed * 5;
      }
      if (moonMesh) {
        moonMesh.rotation.y -= speed * 10;
      }
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.birth += dt;
      const posAttr = e.pts.geometry.getAttribute('position');
      for (let j = 0; j < posAttr.count; j++) {
        let vx = e.velocities[3 * j + 0] * dt;
        let vy = e.velocities[3 * j + 1] * dt;
        let vz = e.velocities[3 * j + 2] * dt;
        if (!Number.isFinite(vx)) { vx = 0; e.velocities[3 * j + 0] = 0; }
        if (!Number.isFinite(vy)) { vy = 0; e.velocities[3 * j + 1] = 0; }
        if (!Number.isFinite(vz)) { vz = 0; e.velocities[3 * j + 2] = 0; }
        const nx = posAttr.array[3 * j + 0] + vx;
        const ny = posAttr.array[3 * j + 1] + vy;
        const nz = posAttr.array[3 * j + 2] + vz;
        posAttr.array[3 * j + 0] = Number.isFinite(nx) ? nx : 0;
        posAttr.array[3 * j + 1] = Number.isFinite(ny) ? ny : 0;
        posAttr.array[3 * j + 2] = Number.isFinite(nz) ? nz : 0;
        e.velocities[3 * j + 0] *= 0.999;
        e.velocities[3 * j + 1] *= 0.999;
        e.velocities[3 * j + 2] *= 0.999;
      }
      posAttr.needsUpdate = true;
      const t = e.birth / e.life;
      e.pts.material.opacity = Math.max(0, 1.0 - t);
      if (e.birth > e.life) {
        scene.remove(e.pts);
        explosions.splice(i, 1);
      }
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.birth += dt;
      const t = s.birth / s.life;
      s.mesh.scale.setScalar(1 + t * 8);
      s.mesh.material.opacity = Math.max(0, 0.9 * (1 - t));
      if (s.birth > s.life) {
        scene.remove(s.mesh);
        shockwaves.splice(i, 1);
      }
    }

    newLabel.textContent = currentYear.toFixed(2);
    if (typeof loadingText !== 'undefined' && loadingText) {
      if (didTimeBroke) {
        try { if (loadingDotsInterval) clearInterval(loadingDotsInterval); } catch (e) { }
        loadingText.style.opacity = '0';
        loadingText.style.transform = 'translateY(8px)';
        setTimeout(() => {
          try { loadingText.remove(); } catch (e) { }
          try { _style.remove(); } catch (e) { }
        }, 280);
      }
    }
    _frameCounter++;
    if (didTimeBroke || (_frameCounter % 60) === 0) {
      scanSceneForInvalidPositions();
    }
  }
  renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);