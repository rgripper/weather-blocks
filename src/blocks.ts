import * as THREE from "three";
let camera, scene, renderer;
let mesh;

const cubesize = 30;
const landscape_width = 30;
const landscape_length = 30;
const heights = [];
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
  for (let i = 0; i < landscape_width; i++) heights[(i, 0)] = 0;
  for (let j = 0; j < landscape_length; j++) heights[(0, j)] = 0;

  for (let i = 1; i < landscape_width; i++) {
    const h = heights[(i - 1, 0)];
    for (let j = 1; j < landscape_length; j++) {
      const rand = Math.random();
      if (heights[(i - 1, j)] == heights[(i, j - 1)]) {
        // level ground, go up dn or stay
        if (rand < 0.33) heights[(i, j)] = heights[(i - 1, j)] - cubesize;
        else if (rand > 0.66) heights[(i, j)] = heights[(i - 1, j)] + cubesize;
        else heights[(i, j)] = heights[(i - 1, j)];
      } else if (Math.abs(heights[(i - 1, j)] - heights[(i, j - 1)]) > cubesize) {
        // two edges are wide apart, split the difference
        heights[(i, j)] = (heights[(i - 1, j)] + heights[(i, j - 1)]) / 2;
      } else {
        if (rand > 0.5) heights[(i, j)] = heights[(i - 1, j)];
        else heights[(i, j)] = heights[(i, j - 1)];
      }

      const grayness = Math.random() * 0.5 + 0.25,
        mat = new THREE.MeshBasicMaterial(),
        cube = new THREE.Mesh(geom, mat);
      mat.color.setRGB(0, grayness, 0);
      console.log(heights);
      cube.position.set(i * cubesize - xoff, j * cubesize - yoff, heights[(i, j)]);
      cubes.add(cube);
    }
  }

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
const angle = 0;
function animate() {
  //angle += 0.2;
  const rads = (angle * Math.PI) / 180;
  camera.position.set(Math.cos(rads) * camera_offset, Math.sin(rads) * camera_offset, camera_height);
  camera.lookAt(scene.position);
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

init();

animate();
