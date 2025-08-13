import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { currentLocationState, locationWatcherIdState } from './hooks/walkAtoms';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import Mypage from './pages/Mypage';
import Walk_new from './pages/Walk_new';

import CourseDetailPage from './pages/CourseDetailPage';
import Walk_existing from './pages/Walk_existing';
import Walk_countdown from './pages/Walk_countdown';
import NotFoundPage from './pages/NotFoundPage';
import Koricopter from './pages/Koricopter';
import Course_create_detail from './pages/Course_create_detail';
import Walk_record_after_walk_ from './pages/Walk_record_after_walk';
import My_profile from './pages/My_profile';
import AgreementPage from './pages/AgreementPage';
import Neighborhood_Settings from './pages/Neighborhood_Settings';
import Animal_Settings from './pages/Animal_Settings';
import WalkRecordsList from './pages/WalkRecordsList';
import WalkRecordDetails from './pages/WalkRecordDetails';
import CoursePhotozones from './pages/CoursePhotozones';
import SearchDog from './pages/SearchDog';
import Recommended_course_list from './pages/Recommended_course_list';

// 전역 위치 추적 컴포넌트
function GlobalLocationTracker() {
  const setCurrentLocation = useSetRecoilState(currentLocationState);
  const setLocationWatcherId = useSetRecoilState(locationWatcherIdState);

  useEffect(() => {
    if (!navigator.geolocation) return;

    console.log('🌍 전역 위치 추적 시작');
    const watcherId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        console.log('📍 전역 위치 업데이트:', { lat, lng });
      },
      (error) => {
        console.warn('⚠️ 전역 위치 추적 오류:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    setLocationWatcherId(watcherId);

    return () => {
      console.log('🧹 전역 위치 추적 종료');
      navigator.geolocation.clearWatch(watcherId);
      setLocationWatcherId(undefined);
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <GlobalLocationTracker />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/homepage" element={<HomePage />} />
        <Route path="/my_profile" element={<My_profile />} />
        <Route path="/course_selected_detail" element={<CourseDetailPage />} />
        <Route path="/walk_countdown" element={<Walk_countdown />} />
        <Route path="/walk_new" element={<Walk_new />} />
        <Route path="/walk_existing" element={<Walk_existing />} />
        <Route path="/koricopter" element={<Koricopter />} />
        <Route
          path="/course_create_detail"
          element={<Course_create_detail />}
        />
        <Route
          path="/walk_record_after_walk"
          element={<Walk_record_after_walk_ />}
        />
        <Route path="/agree_ment" element={<AgreementPage />} />
        <Route
          path="/neighborhood_setting"
          element={<Neighborhood_Settings />}
        />
        <Route path="/animal_setting" element={<Animal_Settings />} />
        <Route path="/walk_records" element={<WalkRecordsList />} />
        <Route
          path="/walk_records/:walkRecordId"
          element={<WalkRecordDetails />}
        />
        <Route path="/course_photozones" element={<CoursePhotozones />} />
        <Route path="/search_dog" element={<SearchDog />} />
        <Route path="/recommended_course_list" element={<Recommended_course_list/>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
