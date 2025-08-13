import { useState, useRef, useEffect } from 'react';
import KakaoMap from './KakaoMap';
import BottomSheet from './BottomSheet';
import StartWalkButton from './StartWalkButton';
import MyLocationButton from './MyLocationButton';
import LocationButton from './LocationButton';
import { useRecoilValue } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { currentLocationState } from '../hooks/walkAtoms';
import { getSummaryProfile } from '../services/users';

const HomePage = () => {
  const [markRequested, setMarkRequested] = useState(false);
  const mapRef = useRef<any>(null);
  const petName = useRecoilValue(nameState);
  const currentLocation = useRecoilValue(currentLocationState);

  // 요약 프로필 로드 (메인 상단에 사용할 수 있음)
  useEffect(() => {
    // API 요청 중복 방지를 위한 플래그
    let isLoading = false;

    const loadProfile = async () => {
      if (isLoading) return;
      isLoading = true;

      try {
        await getSummaryProfile();
      } catch (e) {
        // optional: 무시
      } finally {
        isLoading = false;
      }
    };

    // 약간의 지연 후 호출 (중복 렌더링 방지)
    const timer = setTimeout(loadProfile, 100);

    return () => {
      clearTimeout(timer);
      isLoading = false;
    };
  }, []);

  const handleMoveToMyLocation = () => {
    mapRef.current?.moveToMyLocation?.(); // KakaoMap.tsx의 useImperativeHandle에서 정의한 메서드
  };

  const handleMark = () => {
    setMarkRequested(false);
    // 마커 찍고 나서 추가 작업 가능
  };

  const moveToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapRef.current?.moveToMyLocation?.();
      });
    }
  };

  return (
    <div className="relative w-screen h-screen">
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={handleMark}
        drawingEnabled={false}
        ref={mapRef}
        initialPosition={currentLocation}
      >
        <LocationButton />
        <BottomSheet mapRef={mapRef} />
      </KakaoMap>
    </div>
  );
};

export default HomePage;
