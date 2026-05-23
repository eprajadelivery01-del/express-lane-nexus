import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers } from "@/services/logger";

initializeGlobalErrorHandlers("Central de Comando (Admin)");

createRoot(document.getElementById("root")!).render(<App />);
