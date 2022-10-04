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
      sunPosition
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

function getPosition(
  sunPosition: { azimuth: number; altitude: number },
  distance: number
) {
  return [
    -Math.sin(sunPosition.azimuth) * distance,
    Math.sin(sunPosition.altitude) * distance,
    Math.cos(sunPosition.azimuth) * distance,
  ] as const;
}

function adjustLightByAltitude(
  peakColor: number,
  position: SunCalc.GetSunPositionResult
) {
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

  const rgb = hexToRgb(peakColor);
  rgb.b = Math.round((rgb.b * (1 + position.altitude / (Math.PI / 2))) / 2);
  rgb.g = Math.round((rgb.g * (1 + position.altitude / (Math.PI / 2))) / 2);
  const altitudeFilteredColor = rgbToHex(rgb);
  return altitudeFilteredColor;
}

const startDate = new Date(2022, 8, 2);
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

  const [currentTime, setCurrentTime] = useState(
    startDate.toLocaleTimeString("en-UK", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  useEffect(() => {
    if (container) {
      const { render, element } = init({
        elevationBlocks: generateElevationBlocks({ width, length }),
        cubeSize,
        landscapeRadius: width / 2,
      });

      let angle = 0;
      let isDone = false;
      const date = startDate;
      const tick = () => {
        if (isDone) return;

        function getHourToHourAngle(hourFromMidnight: number) {
          return degreesToRadians(15 * (hourFromMidnight - 12));
        }

        function degreesToRadians(deg: number) {
          return (deg * Math.PI) / 180;
        }

        function getSolarDeclinaton(dayOfYear: number) {
          return (
            degreesToRadians(23.45) *
            Math.sin((degreesToRadians(360) / 365) * dayOfYear)
          );
        }

        function getZenithAngle(
          latitudeRadians: number,
          declination: number,
          hourAngle: number
        ) {
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
          const solarRadiation = 1333;
          const hourangle = getHourToHourAngle(hour);
          const declination = getSolarDeclinaton(dayOfYear);
          const zenithAngle = getZenithAngle(latitude, declination, hourangle);
          // console.log({ hourangle, declination, zenithangle })
          return solarRadiation * Math.cos(zenithAngle);
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

        const sunPosition = SunCalc.getPosition(date, 40.1789, -3.5156);
        const moonPosition = SunCalc.getMoonPosition(date, 40.1789, -3.5156);
        const moonIllumination = SunCalc.getMoonIllumination(date);

        render(angle, date, sunPosition, moonPosition, moonIllumination);
        date.setTime(date.getTime() + 1000 * 60 * 20);

        setCurrentTime(
          date.toLocaleTimeString("en-UK", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        // angle = angle > 360 ? 0 : angle + 0.2;
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

  return (
    <div>
      <h3>{currentTime}</h3>
      <div ref={setContainer}></div>
    </div>
  );
}
