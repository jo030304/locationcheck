import { createRoot } from 'react-dom/client';
import { RecoilRoot } from 'recoil'; // ✅ RecoilRoot 임포트
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <RecoilRoot>
    <App />
  </RecoilRoot>,
);
