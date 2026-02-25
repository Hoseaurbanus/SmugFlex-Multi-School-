import { School } from 'lucide-react';
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SchoolProvider } from "./contexts/SchoolContext";
import { NotificationServiceProvider } from "./contexts/NotificationService";
import App from "./App.tsx";
import "./index.css";

// Global error handler to catch ALL unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  
  // Prevent ALL unhandled promise rejections from appearing in console
  if (reason && typeof reason === 'object') {
    const code = reason?.code;
    const status = reason?.status;
    const message = reason?.message;
    
    // Handle 403/401 errors gracefully
    if (code === 403 || status === 403 || (typeof message === 'string' && message.includes('403'))) {
      console.warn('Permission denied (403) - handled globally:', { code, status, message });
      event.preventDefault();
      return;
    }
    
    if (code === 401 || status === 401 || (typeof message === 'string' && message.includes('401'))) {
      console.warn('Authentication error (401) - handled globally:', { code, status, message });
      event.preventDefault();
      return;
    }
  }
  
  // Catch everything else
  console.warn('Unhandled promise rejection (global catch):', reason);
  event.preventDefault();
});

// Also catch uncaught errors
window.addEventListener('error', (event) => {
  console.warn('Uncaught error (global catch):', event.error);
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
  