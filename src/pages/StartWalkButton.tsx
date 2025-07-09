import { useNavigate } from 'react-router-dom';
import Walk_countdown from './Walk_countdown';

export default function StartWalkButton() {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/walk_countdown', { state: { from: 'main' } });
  };

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 
             bg-green-600 text-white py-3 rounded-full shadow-lg cursor-pointer 
             w-[40vw] max-w-xs"
    >
      산책 시작하기
    </button>

  );
}
