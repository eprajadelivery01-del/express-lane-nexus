import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGlobalErrorHandlers, reportErrorToTelegram } from "@/services/logger";
import { toast as sonnerToast } from "sonner";

initializeGlobalErrorHandlers("Central de Comando (Admin)");

// Patch sonner toast.error globally to automatically capture all user-facing errors
const originalError = sonnerToast.error;
sonnerToast.error = function (message: any, options: any) {
  const text = typeof message === "string" ? message : JSON.stringify(message);
  reportErrorToTelegram({
    error_message: `Alerta para o Usuário: ${text}`,
    stack_trace: `Sonner toast.error exibido na tela do administrador.`,
    url: window.location.href,
    additional_info: {
      isUserFacingAlert: true,
      options: options ? JSON.stringify(options) : ""
    }
  }, "Central de Comando (Admin)").catch(() => {});
  
  return originalError.apply(this, arguments as any);
};

createRoot(document.getElementById("root")!).render(<App />);
