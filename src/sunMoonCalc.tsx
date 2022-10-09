import SunCalc from "suncalc";
import { getPosition } from "./TerrainPreview";

export type SunOrMoonState = ReturnType<typeof getMoonState>

export function getSunMoonStates(date: Date, geoPosition: { latitude: number, longitude: number }) {
  const sunPosition = SunCalc.getPosition(date, geoPosition.latitude, geoPosition.longitude);
  const moonPosition = SunCalc.getMoonPosition(date, geoPosition.latitude, geoPosition.longitude);
  const moonIllumination = SunCalc.getMoonIllumination(date);
  return {
    sunState: getSunState(sunPosition),
    moonState: getMoonState(moonPosition, moonIllumination)
  }
}

function getMoonState(
  position: SunCalc.GetMoonPositionResult,
  illumination: SunCalc.GetMoonIlluminationResult) {
  const moonLightPeakColor = 0xefffff; // it's slightly bluish
  const altitudeFilteredColor = adjustLightByAltitude(
    moonLightPeakColor,
    position
  );

  const defaultMoonlightIntensity = 0.002;
  const moonDistance = 2000; // moonPosition.distance
  const intensity = defaultMoonlightIntensity * illumination.fraction;
  const positionVec = getPosition(position, moonDistance);
  return {
    intensity,
    altitudeFilteredColor,
    positionVec,
  };
}

function getSunState(position: SunCalc.GetSunPositionResult) {
  const sunLightPeakColor = 0xffffff;
  const altitudeFilteredColor = adjustLightByAltitude(
    sunLightPeakColor,
    position,
    1
  );

  const distance = 2000;
  const positionVec = getPosition(position, distance);
  const intensity = 1;
  return { intensity, altitudeFilteredColor, positionVec };
}
function adjustLightByAltitude(
  peakColor: number,
  position: SunCalc.GetSunPositionResult,
  x?: number
) {
  const rgb = hexToRgb(peakColor);
  const altitudeFactor = Math.cos(position.altitude * 2);

  // Fake Rayleigh scattering
  const blueFilterFactor = Math.min(1, 1.5 * Math.max(0, altitudeFactor)); // it drops as the sun goes higher

  rgb.b = Math.round(rgb.b * (1 - blueFilterFactor));
  rgb.g = Math.round(rgb.g * (1 - 0.6 * blueFilterFactor));
  const altitudeFilteredColor = rgbToHex(rgb);

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
function rgbToHex({ r, g, b }: { r: number; g: number; b: number; }) {
  return parseInt(
    componentToHex(r) + componentToHex(g) + componentToHex(b),
    16
  );
}
