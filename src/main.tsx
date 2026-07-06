import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SchoolProvider } from "./contexts/SchoolContext";
import { NotificationServiceProvider } from "./contexts/NotificationService";
import App from "./App.tsx";
import "./index.css";

// Suppress noisy 401/403 rejections from background polling — these are expected
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

  const isExpectedAuthError =
    code === 403 || status === 403 || httpStatus === 403 || message.includes('403') ||
    code === 401 || status === 401 || httpStatus === 401 || message.includes('401');

  if (isExpectedAuthError) {
    event.preventDefault();
    return;
  }

  // Log unexpected rejections instead of swallowing them
  console.error('[Unhandled Promise Rejection]', reason);
};

window.addEventListener('unhandledrejection', handleUnhandledRejection);

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
