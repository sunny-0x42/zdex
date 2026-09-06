import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DexProvider } from "./context";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DexProvider>
      <App />
    </DexProvider>
  </React.StrictMode>,
);
