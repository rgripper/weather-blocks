import { useState } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import "./app.css";
import { TerrainPreview } from "./TerrainPreview";

export function App() {
  return <TerrainPreview width={75} length={75} cubeSize={30} />;
}
