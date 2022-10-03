import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

type BiomeType = "white" | "green" | "brown" | "water";

export type TerrainBlock = {
  position: [number, number, number];
  biomeType: BiomeType;
};

export function* generateElevationBlocks(landscapeSize: {
  width: number;
  length: number;
}) {
  const xoff = landscapeSize.width / 2;
  const zoff = landscapeSize.length / 2;
  const noise2D = createNoise2D();
  const noise_scale = 0.02;
  for (let i = 1; i < landscapeSize.width; i++) {
    for (let j = 1; j < landscapeSize.length; j++) {
      const elevation = Math.floor(
        noise2D(noise_scale * i, noise_scale * j) * 10
      );
      const block: TerrainBlock = {
        position: [i - xoff, elevation, j - zoff],
        biomeType:
          elevation > 6
            ? "white"
            : elevation > 4
            ? "brown"
            : elevation < 0
            ? "water"
            : "green",
      };
      yield block;
    }
  }
}

export function convertTerrainBlockToMesh(
  { position: [x, y, z], biomeType }: TerrainBlock,
  boxGeometry: THREE.BoxGeometry,
  cubeSize: number
) {
  const mat = new THREE.MeshLambertMaterial();
  const cube = new THREE.Mesh(boxGeometry, mat);
  cube.receiveShadow = true
  cube.castShadow = true
  const color =
    biomeType === "brown"
      ? 0x84694e
      : biomeType === "green"
      ? 0x7cfc00
      : biomeType === "water"
      ? 0x33aaff
      : 0xeeeeee;

  function hexWithGray(hex: number, factor: number) {
    var r = ((hex >> 16) & 255) * factor;
    var g = ((hex >> 8) & 255) * factor;
    var b = (hex & 255) * factor;
    return (r << 16) + (g << 8) + b;
  }

  const grayFactor = Math.min(1, (y + 10) / 20);

  mat.color.setHex(hexWithGray(color, grayFactor));

  cube.position.set(x * cubeSize, Math.max(y, 0) * cubeSize, z * cubeSize);
  return cube;
}
