import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createIcons, icons } from 'lucide';

type StartType = 'create' | 'existing' | undefined;

const Walk_countdown = () => {
  const [seconds, setSeconds] = useState(3);
  const navigate = useNavigate();
  const location = useLocation() as any; // ✅ 오타 수정

  // 1) state(우선) → 쿼리파라미터(state=...) 보조
  const stateFromRoute = (location.state as any)?.startType as StartType;
  const stateFromQuery = new URLSearchParams(location.search).get('state') as StartType;
  const startType: StartType = stateFromRoute ?? stateFromQuery ?? undefined;

  // 코스 정보(기존 코스일 때 전달됨)
  const courseId = (location.state as any)?.courseId ?? null;
  const course   = (location.state as any)?.course   ?? null;

  // 2) 카운트다운 끝나면 라우팅
  useEffect(() => {
    if (seconds <= 0) {
      if (startType === 'existing') {
        // ✅ 유실 대비: 세션에도 저장
        if (courseId) sessionStorage.setItem('selected_course_id', String(courseId));
        if (course)   sessionStorage.setItem('selected_course', JSON.stringify(course));

        navigate('/walk_existing?state=existing', {
          replace: true,
          state: { courseId, course }, // ✅ 그대로 전달
        });
      } else if (startType === 'create') {
        navigate('/walk_new?state=create', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
    const timer = setInterval(() => setSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds, startType, navigate, courseId, course]);

  // 3) 아이콘 색상 커스터마이즈
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
      <div className="relative w-full max-w-[430px] bg-white text-gray-800 text-xl flex flex-col overflow-hidden px-4">

        {/* 하단 페이드 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 z-0 bg-gradient-to-t from-[#E0F2D9] to-transparent" />

        <button
          className="absolute top-3 left-3 px-3 py-1 rounded text-3xl text-gray-400 cursor-pointer z-30"
          onClick={() => navigate(-1)}
        >
          {'<'}
        </button>

        {/* 원형 카운트다운 */}
        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative w-[240px] h-[240px] flex items-center justify-center">
            <svg className="absolute top-0 left-0 w-full h-full -rotate-90 z-30" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="47" fill="none"
                stroke="#4FA65B" strokeWidth="4"
                strokeDasharray="295" strokeDashoffset="0"
                className="animate-stroke" strokeLinecap="round"
              />
            </svg>
            <div className="w-[230px] h-[230px] rounded-full border-[5px] border-[#E0F2D9] flex items-center justify-center z-10">
              <p className="text-[110px]">{seconds}</p>
            </div>
          </div>
        </div>

        {/* 고양이 + 문구 */}
        <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 z-20 flex flex-col items-center">
          <img
            src="/카운트다운%20사진.png"
            alt="wave cat"
            className="w-[160px] h-auto select-none pointer-events-none relative z-10 origin-bottom scale-[1.35] -mb-10"
          />
          <div className="w-[350px] h-[70px] rounded-full flex justify-center items-center gap-2 px-4 text-[18px]
                          text-[#4FA65B] shadow-md bg-gradient-to-b from-[#E7F8E7] to-[#D7F1D7]">
            <i data-lucide="paw-print" style={{ transform: 'rotate(-50deg)', display: 'inline-block', width: 22, height: 22 }} />
            <p>숨 한번 크게 쉬고, 출발 준비!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Walk_countdown;
