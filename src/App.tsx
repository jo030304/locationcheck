import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import Mypage from './pages/Mypage';
import Walk_new from './pages/Walk_new';
import CourseDetailPage from './pages/CourseDetailPage';
import Walk_existing from './pages/Walk_existing';
import Walk_countdown from './pages/Walk_countdown'
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/my" element={<Mypage />} />
        <Route path="/course_selected_detail" element={<CourseDetailPage />} />
        <Route path="/walk_countdown" element={<Walk_countdown />} />
        <Route path="/walk_new" element={<Walk_new />} />
        <Route path="/walk_existing" element={<Walk_existing />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
