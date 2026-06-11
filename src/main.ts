import "leaflet/dist/leaflet.css";
import "./style.css";
import { bootstrap } from "./app";
import { registerServiceWorker } from "./pwa/registerServiceWorker";

void bootstrap();
registerServiceWorker();
