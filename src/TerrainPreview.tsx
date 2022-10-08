import { useEffect, useState } from "preact/hooks";
import { generateElevationBlocks } from "./blocks";
import SunCalc from "suncalc";
import { initRenderer } from "./initRenderer";

export function getPosition(
  sunPosition: { azimuth: number; altitude: number },
  distance: number
) {
  return [
    -Math.sin(sunPosition.azimuth) * distance,
    Math.sin(sunPosition.altitude) * distance,
    Math.cos(sunPosition.azimuth) * distance,
  ] as const;
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
      const { render, element } = initRenderer({
        elevationBlocks: generateElevationBlocks({ width, length }),
        cubeSize,
        landscapeRadius: width / 2,
      });

      let angle = 0;
      let isDone = false;
      const date = startDate;
      const tick = () => {
        if (isDone) return;

        const sunPosition = SunCalc.getPosition(date, 40.1789, -3.5156);
        const moonPosition = SunCalc.getMoonPosition(date, 40.1789, -3.5156);
        const moonIllumination = SunCalc.getMoonIllumination(date);

        render(angle, date, sunPosition, moonPosition, moonIllumination);
        date.setTime(date.getTime() + 1000 * 60 * 3);

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
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          width: "100%",
          textAlign: "center",
          top: 0,
          left: 0,
        }}
      >
        <h3
          style={{
            padding: "8px",
            background: "#fffa",
            display: "inline-block",
          }}
        >
          {currentTime}
        </h3>
      </div>
      <div ref={setContainer}></div>
    </div>
  );
}
