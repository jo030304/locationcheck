import { useState, useRef } from 'react';
import KakaoMap from './KakaoMap';
import BottomSheet from './BottomSheet';
import StartWalkButton from './StartWalkButton';
import MyLocationButton from './MyLocationButton';
import LocationButton from './LocationButton';

const HomePage = () => {
  const [markRequested, setMarkRequested] = useState(false);
  const mapRef = useRef<any>(null);

  const handleMark = () => {
    setMarkRequested(false);
    // 마커 찍고 나서 추가 작업 가능
  };

  const moveToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapRef.current?.moveCenter(lat, lng); // KakaoMap 내부에 moveCenter 구현되어 있어야 작동
      });
    }
  };

  return (
    <div className="relative w-screen h-screen">
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={handleMark}
        drawingEnabled={false}
        walkId="dummy-id" // 필요한 경우 실제 값으로 바꿔줘
        ref={mapRef}
      >
        <LocationButton />
        <MyLocationButton onClick={moveToCurrentLocation} />
        <BottomSheet />
      </KakaoMap>
      <StartWalkButton />
    </div>
  );
};

export default HomePage;
