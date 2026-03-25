import { createRoot } from "react-dom/client";
import { initMonitoring } from "./lib/monitoring";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Initialize error monitoring before anything else
initMonitoring();

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
