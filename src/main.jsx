import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import EquipmentLogApp from "./App.jsx";

// The default auto-injected registration only calls navigator.serviceWorker
// .register() once and never checks again, so an already-open/installed
// (home screen) PWA can sit on a stale build indefinitely until the OS
// happens to recheck. Poll for updates ourselves and reload the moment a
// new deploy is found, so the app self-heals within about a minute.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    setInterval(() => registration.update(), 60 * 1000);
  },
  onNeedRefresh() {
    updateSW(true);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EquipmentLogApp />
  </React.StrictMode>
);
