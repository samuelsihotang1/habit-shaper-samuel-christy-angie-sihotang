import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from '@/App';
import { AuthProvider } from '@/hooks/useAuth';
import { refreshAuthCookies } from '@/utils/cookies';
import '@/index.css';

// Once per load, not per mount: pushes both cookies' expiry out again (utils/cookies.ts).
refreshAuthCookies();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
