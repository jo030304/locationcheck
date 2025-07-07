import { useState } from 'react';
import KakaoMap from './KakaoMap';
import BottomSheet from './BottomSheet';

const HomePage = () => {
  const [markRequested, setMarkRequested] = useState(false);

  const handleMark = () => {
    setMarkRequested(false);
    // 마커 찍고 나서 추가 작업 가능
  };

  return (
    <div className="relative w-screen h-screen">
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={handleMark}
      >
        <BottomSheet />
      </KakaoMap>
    </div>
  );
};

export default HomePage;
