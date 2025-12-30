
import { School } from 'lucide-react';
import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import { SchoolProvider } from "./contexts/SchoolContext";
  import { NotificationServiceProvider } from "./contexts/NotificationService";
  import App from "./App.tsx";
  import "./index.css";

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
  