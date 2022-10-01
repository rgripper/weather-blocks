import { useEffect, useState } from "preact/hooks";
import * as THREE from "three";
import {
  convertTerrainBlockToMesh,
  generateElevationBlocks,
  TerrainBlock,
} from "./blocks";
import SunCalc from "suncalc";

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
  light.position.set(40, 60, 225);
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
    angle: number,
    sunPosition: SunCalc.GetSunPositionResult
  ) {
    const rads = (angle * Math.PI) / 180;
    camera.position.set(
      Math.cos(rads) * cameraOffset,
      Math.sin(rads) * cameraOffset,
      cameraHeight
    );

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

    const fastGrowthAndFlatMid = (x: number) => Math.log10(1 + x * 9)
    const preceivedIntensity = fastGrowthAndFlatMid(sunPosition.insolation);
    const peakColor = 0xffffff;
    const rgb = hexToRgb(peakColor);
    rgb.b = Math.round(rgb.b * (1 + sunPosition.altitude) / 2);
    rgb.g = Math.round(rgb.g * (1 + sunPosition.altitude) / 2);

    const altitudeFilteredColor = rgbToHex(rgb);
    console.log(rgb, altitudeFilteredColor.toString(16).padStart(6, "0"));

    light.intensity = preceivedIntensity;
    light.color = new THREE.Color(altitudeFilteredColor);
    light.lookAt(scene.position);
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }

  return {
    render: (angle: number, sunPosition: SunCalc.GetSunPositionResult) => {
      render(camera, renderer, scene, angle, sunPosition);
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
      const date = new Date(2022, 8, 24);
      const tick = () => {
        if (isDone) return;

        function hourToHourAngle(hourFromMidnight: number) {
          return degreesToRadians(15 * (hourFromMidnight - 12));
        }

        function degreesToRadians(deg: number) {
          return (deg * Math.PI) / 180;
        }

        function solarDeclinaton(dayOfYear: number) {
          return (
            degreesToRadians(23.45) *
            Math.sin((degreesToRadians(360) / 365) * dayOfYear)
          );
        }

        function zenithAngle(
          latitude: number,
          declination: number,
          hourAngle: number
        ) {
          const latitudeRadians = degreesToRadians(latitude);
          return (
            Math.acos(Math.sin(latitudeRadians) * Math.sin(declination)) +
            Math.cos(latitudeRadians) *
              Math.cos(declination) *
              Math.cos(hourAngle)
          );
        }

        function hourInsolaton(
          latitude: number,
          hour: number,
          dayOfYear: number
        ) {
          // const solarradiation = 1333;
          const hourangle = hourToHourAngle(hour);
          const declination = solarDeclinaton(dayOfYear);
          const zenithangle = zenithAngle(latitude, declination, hourangle);
          // console.log({ hourangle, declination, zenithangle })
          return -Math.cos(zenithangle);
        }

        function daysIntoYear(date: Date) {
          return (
            (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
              Date.UTC(date.getFullYear(), 0, 0)) /
            24 /
            60 /
            60 /
            1000
          );
        }

        const position = SunCalc.getPosition(date, 40.1789, -3.5156);
        console.log(
          date.getHours(),
          hourInsolaton(40.1789, date.getHours(), daysIntoYear(date)).toFixed(
            2
          ),
          position.altitude.toFixed(2)
        );
        ///
        render(angle, {
          ...position,
          insolation: hourInsolaton(
            40.1789,
            date.getHours() + date.getMinutes() / 60,
            daysIntoYear(date)
          ),
        });
        date.setTime(date.getTime() + 1000 * 60 * 2);
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
