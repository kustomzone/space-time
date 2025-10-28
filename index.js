import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

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
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});
material.map.colorSpace = THREE.SRGBColorSpace;
const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});
const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
});
const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const starObjs = [];
setInterval(() => {
  const stars = getStarfield({ numStars: 1000 / 8 });
  scene.add(stars);
  starObjs.push(stars);
}, 1000 / 8);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(-2, 0.1, 0.5);
scene.add(sunLight);

const sunRadius = 1.2;
const sunGeometry = new THREE.SphereGeometry(sunRadius, 64, 64);
const sunSurfaceMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, blending: THREE.AdditiveBlending });
const sunMesh = new THREE.Mesh(sunGeometry, sunSurfaceMat);
sunMesh.position.set(-20, 0.5, -2);
sunGroup.add(sunMesh);

const sunGlow = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow.scale.setScalar(1.0);
sunGlow.position.copy(sunMesh.position);
sunGroup.add(sunGlow);
const sunGlow2 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow2.scale.setScalar(1.02);
sunGlow2.position.copy(sunMesh.position);
sunGroup.add(sunGlow2);
const sunGlow3 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow3.scale.setScalar(1.05);
sunGlow3.position.copy(sunMesh.position);
sunGroup.add(sunGlow3);
const sunGlow4 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow4.scale.setScalar(1.1);
sunGlow4.position.copy(sunMesh.position);
sunGroup.add(sunGlow4);
const sunGlow5 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow5.scale.setScalar(1.2);
sunGlow5.position.copy(sunMesh.position);
sunGroup.add(sunGlow5);
const sunGlow6 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow6.scale.setScalar(1.4);
sunGlow6.position.copy(sunMesh.position);
sunGroup.add(sunGlow6);
const sunGlow7 = new THREE.Mesh(sunGeometry, getFresnelMat({ rimHex: 0xffaa22, facingHex: 0x110000 }));
sunGlow7.scale.setScalar(1.6);
sunGlow7.position.copy(sunMesh.position);
sunGroup.add(sunGlow7);

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

loader.load('./textures/moonmap1k.jpg', (moonTex) => {
  try { moonTex.colorSpace = THREE.SRGBColorSpace; } catch (e) {}
  loader.load('./textures/moonbump1k.jpg', (bumpTex) => {
    try { bumpTex.colorSpace = THREE.SRGBColorSpace; } catch (e) {}
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

let speed = 0.0005;
let speed2 = 0.00005;
let speed3 = 0.01;
let timeTravel = true;
let currentYear = new Date().getFullYear();
const newLabel = document.createElement('div');
newLabel.style = 'color: white; font-weight: bold; position: absolute; z-index: 10; top: 15px; left: 0; right: 0; margin: auto; width: fit-content;'
newLabel.textContent = currentYear.toFixed(2);
document.body.append(newLabel);
let didTimeBroke = false;
setTimeout(() => {
  didTimeBroke = true;
}, 3000);
let speed1Bkp;
let speed2Bkp;
let speed3Bkp;
let countBkp;
setTimeout(() => {
  didTimeBroke = false;

  const duration = 1000; // transition duration in ms (adjust as needed)
  const startTime = performance.now();

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
    return x * x * (3 - 2 * x); // smooth easing
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
      // finalize to target values
      speed = target.speed;
      speed2 = target.speed2;
      speed3 = target.speed3;
      count = target.count;
    }
  }

  requestAnimationFrame(animate);
}, 13599);

setTimeout(() => {
  speed = speed1Bkp;
  speed2 = speed2Bkp;
  speed3 = speed3Bkp;
  count = countBkp;
  didTimeBroke = true;
  timeTravel = false;
}, 25000);
setInterval(() => {
  timeTravel = !timeTravel;
}, 60000);
let timeSpeed = 0.001;
const clock = new THREE.Clock();

const explosions = [];
const shockwaves = [];

let count = 20;
function createExplosion(pos) {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).normalize();
    const r = Math.random() * 1.6;
    positions[3 * i + 0] = pos.x + v.x * 0.1;
    positions[3 * i + 1] = pos.y + v.y * 0.1;
    positions[3 * i + 2] = pos.z + v.z * 0.1;
    velocities[3 * i + 0] = v.x * r * (6 + Math.random() * 8);
    velocities[3 * i + 1] = v.y * r * (6 + Math.random() * 8);
    velocities[3 * i + 2] = v.z * r * (6 + Math.random() * 8);
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
    // orbit & spin moon in the same direction as time travel
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
    // orbit & spin moon in reverse when reversing time travel
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
      const vx = e.velocities[3 * j + 0] * dt;
      const vy = e.velocities[3 * j + 1] * dt;
      const vz = e.velocities[3 * j + 2] * dt;
      posAttr.array[3 * j + 0] += vx;
      posAttr.array[3 * j + 1] += vy;
      posAttr.array[3 * j + 2] += vz;
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
  renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);