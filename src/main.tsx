import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAnalytics } from "@/lib/analytics";

initAnalytics();
window.addEventListener("cookie-consent-updated", () => initAnalytics());

createRoot(document.getElementById("root")!).render(<App />);
