import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Mypage from './pages/Mypage';
import Walk_new from './pages/Walk_new';
import CourseDetailPage from './pages/CourseDetailPage';
import Walk_existing from './pages/Walk_existing';
import Walk_countdown from './pages/Walk_countdown'
import NotFoundPage from './pages/NotFoundPage';
import Koricopter from './pages/koricopter';
import Course_create_detail from './pages/Course_create_detail';
import Walk_record_after_walk_ from './pages/Walk_record_after_walk';
import My_profile from './pages/My_profile';
import AgreementPage from './pages/AgreementPage';
import Neighborhood_Settings from './pages/Neighborhood_Settings';
import Animal_Settings from './pages/Animal_Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/my_profile" element={<My_profile />} />
        <Route path="/course_selected_detail" element={<CourseDetailPage />} />
        <Route path="/walk_countdown" element={<Walk_countdown />} />
        <Route path="/walk_new" element={<Walk_new />} />
        <Route path="/walk_existing" element={<Walk_existing />} />
        <Route path="/koricopter" element={<Koricopter />} />
        <Route path="/course_create_detail" element={<Course_create_detail />} />
        <Route path="/walk_record_after_walk" element={<Walk_record_after_walk_ />} />
        <Route path="/agree_ment" element={<AgreementPage />} />
        <Route path="/neighborhood_setting" element={<Neighborhood_Settings />} />
        <Route path="/animal_setting" element={<Animal_Settings />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
