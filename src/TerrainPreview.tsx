import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as THREE from "three";
import {
  convertTerrainBlockToMesh,
  generateElevationBlocks,
  TerrainBlock,
} from "./blocks";

function init({
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
  camera.position.set(0, cameraOffset, cameraHeight);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  const scene = new THREE.Scene();

  const geom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set( 40, 60, 225);
  light.shadow.mapSize.width = 512; // default
  light.shadow.mapSize.height = 512; // default
  light.castShadow = true;
  light.shadow.bias = -0.005; // reduces self-shadowing on double-sided objects

  light.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(50, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffccaa,
      })
    )
  );

  const items = Array.from(elevationBlocks).map((block) => ({
    mesh: convertTerrainBlockToMesh(block, geom, cubeSize),
    block,
  }));

  const cubes = items.reduce(
    (cubes, item) => cubes.add(item.mesh),
    new THREE.Object3D()
  );

  scene.add(cubes);
  scene.add(light);

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
    camera: THREE.Camera,
    renderer: THREE.Renderer,
    scene: THREE.Scene,
    angle: number
  ) {
    const rads = (angle * Math.PI) / 180;
    camera.position.set(
      Math.cos(rads) * cameraOffset,
      Math.sin(rads) * cameraOffset,
      cameraHeight
    );
    light.lookAt(scene.position);
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  return {
    render: (angle: number) => {
      render(camera, renderer, scene, angle);
    },
    element: renderer.domElement,
  };
}

export function TerrainPreview({
  width,
  length,
  cubeSize,
}: {
  width: number;
  length: number;
  cubeSize: number;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (container) {
      const { render, element } = init({
        elevationBlocks: generateElevationBlocks({ width, length }),
        cubeSize,
        landscapeRadius: width / 2,
      });

      let angle = 0;
      let isDone = false;
      const tick = () => {
        if (isDone) return;
        render(angle);
        angle = angle > 360 ? 0 : angle + 0.2;
        window.requestAnimationFrame(tick);
      };
      tick();

      container.append(element);
      return () => {
        isDone = true;
        element.remove();
      };
    }
  }, [container]);

  return <div ref={setContainer}></div>;
}
