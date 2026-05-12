import { School } from 'lucide-react';
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SchoolProvider } from "./contexts/SchoolContext";
import { NotificationServiceProvider } from "./contexts/NotificationService";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.error = noop;
}

// Global error handler to catch ALL unhandled promise rejections
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  
  const message =
    typeof reason === 'string'
      ? reason
      : (reason && typeof reason === 'object' && 'message' in reason)
        ? String((reason as any).message)
        : '';

  const rawCode = reason && typeof reason === 'object' ? (reason as any).code : undefined;
  const rawStatus = reason && typeof reason === 'object' ? (reason as any).status : undefined;
  const rawHttpStatus = reason && typeof reason === 'object' ? (reason as any).httpStatus : undefined;

  const code = Number(rawCode);
  const status = Number(rawStatus);
  const httpStatus = Number(rawHttpStatus);

  // Handle 403/401 errors gracefully (covers object payloads and string errors)
  const is403 = code === 403 || status === 403 || httpStatus === 403 || message.includes('403');
  const is401 = code === 401 || status === 401 || httpStatus === 401 || message.includes('401');

  if (is403) {
    event.preventDefault();
    return;
  }

  if (is401) {
    event.preventDefault();
    return;
  }
  
  // Catch everything else
  event.preventDefault();
};

window.addEventListener('unhandledrejection', handleUnhandledRejection);
// Some browsers/environments surface unhandled rejections via this legacy handler.
// Assigning it ensures our suppression logic runs as early and as broadly as possible.
window.onunhandledrejection = handleUnhandledRejection;

// Also catch uncaught errors
window.addEventListener('error', (event) => {
  event.preventDefault();
});

const basename = "/";

createRoot(document.getElementById("root")!).render(
  <SchoolProvider>
    <NotificationServiceProvider>
      <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </NotificationServiceProvider>
  </SchoolProvider>
);
  