import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

const hash = window.location.hash;
if (hash.includes('type=recovery')) {
  window.location.href = '/reset-password' + hash;
}

createRoot(document.getElementById('root')!).render(<App />);
