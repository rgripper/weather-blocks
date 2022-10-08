import * as THREE from "three";
import { convertTerrainBlockToMesh, TerrainBlock } from "./blocks";
import SunCalc from "suncalc";
import { getPosition } from "./TerrainPreview";

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

  const sunLight = new THREE.DirectionalLight(0xffffff, 1);

  sunLight.position.set(0, 0, 0);

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

  const defaultMoonlightIntensity = 0.02;
  const moonLight = new THREE.DirectionalLight(
    0xefffff,
    defaultMoonlightIntensity
  );
  moonLight.position.set(1000, 100, 225);
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
    camera: THREE.Camera,
    date: Date,
    renderer: THREE.Renderer,
    scene: THREE.Scene,
    angle: number,
    sunPosition: SunCalc.GetSunPositionResult,
    moonPosition: SunCalc.GetMoonPositionResult,
    moonIllumination: SunCalc.GetMoonIlluminationResult
  ) {
    const rads = (angle * Math.PI) / 180;
    camera.position.set(
      Math.cos(rads) * cameraOffset,
      cameraHeight,
      Math.sin(rads) * cameraOffset
    );

    const fastGrowthAndFlatMid = (x: number) => Math.log10(1 + x * 9);

    // const preceivedIntensity = Math.max(
    //   0.1,
    //   Math.cos(Math.PI / 2 - sunPosition.altitude)
    // ); // cos of zenith Angle
    const peakColor = 0xffffff;
    const altitudeFilteredSunlightColor = adjustLightByAltitude(
      peakColor,
      sunPosition,
      1
    );

    const altitudeFilteredMoonlightColor = adjustLightByAltitude(
      peakColor,
      moonPosition
    );

    sunLight.intensity = 1;
    sunLight.color = new THREE.Color(altitudeFilteredSunlightColor);
    sunLight.lookAt(scene.position);
    const sunDistance = 1500;

    const sunPositionVec = getPosition(sunPosition, sunDistance);
    sunLight.position.set(...sunPositionVec);

    moonLight.intensity =
      defaultMoonlightIntensity *
      moonPosition.altitude *
      moonIllumination.fraction;
    moonLight.color = new THREE.Color(altitudeFilteredMoonlightColor);
    moonLight.lookAt(scene.position);
    const moonPositionVec = getPosition(moonPosition, 2000); // moonPosition.distance);
    moonLight.position.set(...moonPositionVec);

    camera.lookAt(scene.position);
    renderer.render(scene, camera);
  }

  return {
    render: (
      angle: number,
      date: Date,
      sunPosition: SunCalc.GetSunPositionResult,
      moonPosition: SunCalc.GetMoonPositionResult,
      moonIllumination: SunCalc.GetMoonIlluminationResult
    ) => {
      render(
        camera,
        date,
        renderer,
        scene,
        angle,
        sunPosition,
        moonPosition,
        moonIllumination
      );
    },
    element: renderer.domElement,
  };
}

function adjustLightByAltitude(
  peakColor: number,
  position: SunCalc.GetSunPositionResult,
  x?: number
) {
  const rgb = hexToRgb(peakColor);
  const altitudeFactor = Math.cos(position.altitude * 2);

  const blueFilterFactor = Math.min(1, 1.5 * Math.max(0, altitudeFactor)); // it drops as the sun goes higher

  rgb.b = Math.round(rgb.b * (1 - blueFilterFactor));
  rgb.g = Math.round(rgb.g * (1 - 0.6 * blueFilterFactor));
  const altitudeFilteredColor = rgbToHex(rgb);
  if (x) {
    console.log(rgb, altitudeFactor, blueFilterFactor);
  }
  return altitudeFilteredColor;
}

function componentToHex(c: number): string {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function hexToRgb(hex: number) {
  var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex.toString(16).padStart(6, "0")
  )!;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return parseInt(
    componentToHex(r) + componentToHex(g) + componentToHex(b),
    16
  );
}
