import '@/styles/theme.scss';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

const render = () => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Initial render
render();

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept('./App', () => {
    console.log("🔥 HMR Reloading './App'...");
    render();
  });
}
