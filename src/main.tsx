import React from 'react';
import ReactDOM from 'react-dom/client';
// Code-splitting: you can switch to `const App = lazy(() => import('./App'))`
// plus `<Suspense fallback={...}>` here; update `src/__tests__/main.test.tsx` assertions first.
import App from './App';
import { store } from './store';
import { Provider } from 'react-redux';
import { I18nProvider } from './i18n/i18n';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { installTauriConsoleBridge } from './utils/tauriConsoleBridge';
import { initializeTheme } from './utils/theme';
import './styles/global.scss';

// Initialize theme before React renders to prevent flash
initializeTheme();
installTauriConsoleBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);
