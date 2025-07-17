import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createIcons, icons } from 'lucide';

const Walk_countdown = () => {
  const [seconds, setSeconds] = useState(3);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (seconds <= 0) {
      const from = location.state?.from;

      if (from === 'exist') {
        navigate('/walk_existing');
      } else if (from === 'main') {
        navigate('/walk_new');
      } else {
        navigate('/');
      }
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  // Lucide 아이콘 렌더링
  useEffect(() => {
    createIcons({ icons });

    const svg = document.querySelector('[data-lucide="paw-print"]') as SVGElement | null;
    if (svg) {
      svg.setAttribute('stroke', 'none');
      svg.setAttribute('fill', '#4FA65B');
    }
  }, []);

  return (
    <div className="min-h-screen flex justify-center bg-[#EBFFEB]">
      <div className="w-full max-w-[430px] bg-white text-gray-800 text-xl flex flex-col overflow-auto relative px-4">
        <button
          className="absolute top-3 left-3 px-3 py-1 rounded text-3xl text-gray-400 cursor-pointer"
          onClick={() => navigate(-1)}
        >
          {'<'}
        </button>

        <div className="flex-grow flex items-center justify-center">
          <div className="relative w-[240px] h-[240px] flex items-center justify-center">
            <svg
              className="absolute top-0 left-0 w-full h-full -rotate-90 z-30"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke="#4FA65B"
                strokeWidth="4"
                strokeDasharray="295"
                strokeDashoffset="0"
                className="animate-stroke"
                strokeLinecap="round"
              />
            </svg>

            <div className="w-[230px] h-[230px] rounded-full border-[5px] border-[#E0F2D9] flex items-center justify-center z-10">
              <p className="text-[110px]">{seconds}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mb-6 py-15">
          <div className="w-[350px] h-[70px] rounded-4xl bg-[#E0F2D9] flex justify-center items-center gap-2 px-3 text-[20px]" style={{ color: "#4FA65B" }}>
            <i
              data-lucide="paw-print"
              style={{
                transform: 'rotate(-50deg)',
                display: 'inline-block',
                width: '20px',
                height: '20px',
              }}
            ></i>
            <p>숨 한번 크게 쉬고, 출발 준비!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Walk_countdown;
