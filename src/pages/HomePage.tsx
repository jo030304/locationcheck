import { useNavigate } from 'react-router-dom';
import KakaoMap from './KakaoMap';
import BottomSheet from './BottomSheet';

const HomePage = () => {
  return (
    <div className="w-full min-h-screen bg-[#EBFFEB] flex justify-center">
      <div className="w-full max-w-[430px] h-screen bg-white px-6 py-10 text-gray-800 text-xl">
        <KakaoMap />
        <div className="flex-1 overflow-y-auto px-6 py-10">
          <BottomSheet />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
