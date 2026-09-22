import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root לא נמצא');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// רישום ה-service worker מאפשר התקנה למסך הבית באנדרואיד וב-iOS
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* עובד גם בלי — רק בלי מצב לא-מקוון */
    });
  });
}
