import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

let camera, scene, renderer;
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

  const xoff = (landscape_width * cubesize) / 2;
  const yoff = (landscape_length * cubesize) / 2;
  const noise2D = createNoise2D();
  const noise_scale = 0.05;
  for (let i = 1; i < landscape_width; i++) {
    heights[i] = [];
    for (let j = 1; j < landscape_length; j++) {
      heights[i][j] = Math.floor(noise2D(noise_scale * i, noise_scale * j) * 10);
      console.log(heights);
      const grayness = 1 - noise2D(noise_scale * i, noise_scale * j),
        mat = new THREE.MeshBasicMaterial(),
        cube = new THREE.Mesh(geom, mat);
      mat.color.setRGB(0, grayness, 0);
      cube.position.set(i * cubesize - xoff, j * cubesize - yoff, heights[i][j] * 30);
      cubes.add(cube);
    }
  }
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
  elevation: number;
  biomeType: BiomeType;
};
function renderElevationMap(map: ElevationMap) {}
