import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import * as THREE from "three";
import {
  convertTerrainBlockToMesh,
  generateElevationMap,
  TerrainBlock,
} from "./blocks";

const cubeSize = 30;
const landscape_width = 70;
const landscape_length = 70;
const camera_offset = cubeSize * landscape_width * 0.7;
const camera_height = (cubeSize * landscape_width) / 2;

function init(elevationMap: Iterable<TerrainBlock>, cubeSize: number) {
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(0, camera_offset, camera_height);
  camera.up = new THREE.Vector3(0, 0, 1);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  const scene = new THREE.Scene();

  const geom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

  const items = Array.from(elevationMap).map((block) => ({
    mesh: convertTerrainBlockToMesh(block, geom, cubeSize),
    block,
  }));

  const cubes = items.reduce(
    (cubes, item) => cubes.add(item.mesh),
    new THREE.Object3D()
  );

  scene.add(cubes);

  const renderer = new THREE.WebGLRenderer();
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
      Math.cos(rads) * camera_offset,
      Math.sin(rads) * camera_offset,
      camera_height
    );
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
      const { render, element } = init(
        generateElevationMap({ width, length }),
        cubeSize
      );

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
