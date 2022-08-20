import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

let camera: THREE.PerspectiveCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer;
let mesh;

const cubesize = 30;
const landscape_width = 70;
const landscape_length = 70;
const heights: number[][] = [];
const camera_offset = cubesize * landscape_width * 0.7;
const camera_height = (cubesize * landscape_width) / 2;

function init() {
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, camera_offset, camera_height);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  scene = new THREE.Scene();

  const geom = new THREE.BoxGeometry(cubesize, cubesize, cubesize);
  const cubes = new THREE.Object3D();
  scene.add(cubes);

  Array.from(generateElevationMap())
    .map((x) => convertTerrainBlockToGeometry(x, geom))
    .forEach((x) => cubes.add(x));

  console.log(heights);
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  //
  window.addEventListener("resize", onWindowResize, false);
}
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
let angle = 0;
function animate() {
  angle += 0.2;
  const rads = (angle * Math.PI) / 180;
  camera.position.set(Math.cos(rads) * camera_offset, Math.sin(rads) * camera_offset, camera_height);
  camera.lookAt(scene.position);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

init();

animate();

///

type BiomeType = "white" | "green" | "brown";

type ElevationMap = number[][];
type TerrainBlock = {
  position: [number, number, number];
  biomeType: BiomeType;
};
function* generateElevationMap() {
  const xoff = landscape_width / 2;
  const yoff = landscape_length / 2;
  const noise2D = createNoise2D();
  const noise_scale = 0.02;
  for (let i = 1; i < landscape_width; i++) {
    for (let j = 1; j < landscape_length; j++) {
      const elevation = Math.floor(noise2D(noise_scale * i, noise_scale * j) * 10);
      const block: TerrainBlock = {
        position: [i - xoff, j - yoff, elevation],
        biomeType: elevation > 6 ? "white" : elevation > 4 ? "brown" : "green",
      };
      yield block;
    }
  }
}

function convertTerrainBlockToGeometry(
  { position: [x, y, z], biomeType }: TerrainBlock,
  boxGeometry: THREE.BoxGeometry
) {
  const mat = new THREE.MeshBasicMaterial();
  const cube = new THREE.Mesh(boxGeometry, mat);
  const color = biomeType === "brown" ? 0x84694e : biomeType === "green" ? 0x7cfc00 : 0xeeeeee;

  function hexWithGray(hex: number, factor: number) {
    var r = ((hex >> 16) & 255) * factor;
    var g = ((hex >> 8) & 255) * factor;
    var b = (hex & 255) * factor;
    console.log((r << 16) + (g << 8) + b);
    return (r << 16) + (g << 8) + b;
  }

  const grayFactor = Math.min(1, (z + 10) / 20);

  mat.color.setHex(hexWithGray(color, grayFactor));

  console.log(grayFactor, color.toString(16), (color % (256 * 256)).toString(16));

  cube.position.set(x * cubesize, y * cubesize, z * cubesize);
  return cube;
}
