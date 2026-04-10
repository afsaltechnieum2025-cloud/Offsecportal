import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * When returning via the browser Back/Forward cache (e.g. from an external SAST/ASM URL),
 * the restored tab can keep an old JS bundle and show the previous loader UI.
 * Reload only on those suite routes so the latest app code and animation always run.
 */
window.addEventListener("pageshow", (e: PageTransitionEvent) => {
  if (!e.persisted) return;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (["/sast", "/asm", "/llm", "/toip"].includes(path)) {
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
