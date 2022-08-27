import { render } from "preact";
import { App } from "./App";
import "./index.css";
import "./blocks";

render(<App />, document.getElementById("app") as HTMLElement);
