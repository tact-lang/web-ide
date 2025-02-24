import '@/styles/theme.scss';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
