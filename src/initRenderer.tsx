import * as THREE from "three";
import { convertTerrainBlockToMesh, TerrainBlock } from "./blocks";
import { getSunMoonStates, SunOrMoonState } from "./sunMoonCalc";

export function initRenderer({
  elevationBlocks,
  cubeSize,
  landscapeRadius,
}: {
  elevationBlocks: Iterable<TerrainBlock>;
  cubeSize: number;
  landscapeRadius: number;
}) {
  const cameraOffset = cubeSize * landscapeRadius * 1.4;
  const cameraHeight = cubeSize * landscapeRadius;

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, cameraHeight, cameraOffset);
  camera.up = new THREE.Vector3(0, 1, 0);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  const scene = new THREE.Scene();

  const geom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  const sunLight = new THREE.DirectionalLight();
  sunLight.shadow.mapSize.width = 512; // default
  sunLight.shadow.mapSize.height = 512; // default
  sunLight.castShadow = true;
  sunLight.shadow.bias = -0.005; // reduces self-shadowing on double-sided objects
  sunLight.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(50, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffccaa,
      })
    )
  );

  const moonLight = new THREE.DirectionalLight();
  moonLight.shadow.mapSize.width = 512; // default
  moonLight.shadow.mapSize.height = 512; // default
  moonLight.castShadow = true;
  moonLight.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(50, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xeeffff,
      })
    )
  );

  moonLight.shadow.bias = -0.005; // reduces self-shadowing on double-sided objects

  const items = Array.from(elevationBlocks).map((block) => ({
    mesh: convertTerrainBlockToMesh(block, geom, cubeSize),
    block,
  }));

  const cubes = items.reduce(
    (cubes, item) => cubes.add(item.mesh),
    new THREE.Object3D()
  );

  scene.add(cubes);
  scene.add(sunLight);
  scene.add(moonLight);

  const renderer = new THREE.WebGLRenderer();
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  window.addEventListener(
    "resize",
    () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );

  function render(
    date: Date,
    geoPosition: { latitude: number; longitude: number },
    angle: number
  ) {
    const rads = (angle * Math.PI) / 180;
    camera.position.set(
      Math.cos(rads) * cameraOffset,
      cameraHeight,
      Math.sin(rads) * cameraOffset
    );

    const { sunState, moonState } = getSunMoonStates(date, geoPosition);

    setLightParams(sunLight, sunState);
    setLightParams(moonLight, moonState);

    moonLight.lookAt(scene.position);
    sunLight.lookAt(scene.position);
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }

  return {
    render,
    element: renderer.domElement,
  };
}

function setLightParams(light: THREE.DirectionalLight, state: SunOrMoonState) {
  const { intensity, altitudeFilteredColor, positionVec } = state;
  light.intensity = intensity;
  light.color = new THREE.Color(altitudeFilteredColor);
  light.position.set(...positionVec);
}
