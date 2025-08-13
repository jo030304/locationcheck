import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import CustomSlider from '../hooks/CustomSlider';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tailcopterScoreState, walkRecordIdState } from '../hooks/walkAtoms';
import { saveTailcopterScore } from '../services/walks';

const Koricopter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const result = new URLSearchParams(location.search).get('result');

  const [sliderValue, setSliderValue] = useState(50);
  const [leftReached, setLeftReached] = useState(false);
  const [rightReached, setRightReached] = useState(false);
  const [count, setCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hideIntroText, setHideIntroText] = useState(false); // ✅ 추가

  // 👉 점수 계산
  const score = Math.min(Math.round((count / 15) * 100), 100);
  let message = '';
  if (score <= 33) {
    message = '다소 아쉬운 산책이었어요.';
  } else if (score <= 66) {
    message = '다음엔 더 신나게 놀아봐요!';
  } else {
    message = '아주 완벽했던 산책이었어요!';
  }

  // 👉 페이지 진입 시 4초 뒤 메시지 예약
  useEffect(() => {
    const msgTimer = setTimeout(() => {
      setShowMessage(true);
    }, 4000);
    return () => clearTimeout(msgTimer);
  }, []);

  const walkRecordId = useRecoilValue(walkRecordIdState);
  const [, setScoreState] = useRecoilState(tailcopterScoreState);
  // 👉 메시지 뜬 후 3초 뒤 navigate
  useEffect(() => {
    if (showMessage) {
      // 서버에 꼬리콥터 점수 저장
      setScoreState(score);
      if (walkRecordId) {
        saveTailcopterScore(walkRecordId, score).catch(() => {});
      }
      const navTimer = setTimeout(() => {
        if (result === 'yes') {
          navigate('/course_create_detail');
        } else if (result === 'no') {
          navigate('/walk_record_after_walk');
        }
      }, 3000);
      return () => clearTimeout(navTimer);
    }
  }, [showMessage, result, navigate]);

  // 👉 슬라이더 조작
  const handleSliderChange = (val: number) => {
    setSliderValue(val);

    if (!hasInteracted) {
      setHasInteracted(true);
      setHideIntroText(true); // ✅ 문구 숨김
    }

    // 점수 보여준 뒤에는 카운트 더 이상 증가 X
    if (showMessage) return;

    if (val <= 5) setLeftReached(true);
    if (val >= 95) setRightReached(true);

    if (leftReached && rightReached) {
      setCount((prev) => prev + 1);
      setLeftReached(false);
      setRightReached(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center h-full text-center px-4 py-6">
      {/* ⬆ 상단 문구 */}
      {showMessage ? (
        <p className="text-[15px] sm:text-[20px] md:text-[25px] lg:text-[30px] leading-relaxed mb-3 text-gray-700">
          {message}
        </p>
      ) : (
        !hideIntroText && (
          <p className="text-[15px] sm:text-[20px] md:text-[25px] lg:text-[30px] leading-relaxed mb-3 text-gray-700">
            까미와 함께한 산책, 즐거웠나요?
          </p>
        )
      )}

      {/* ⬇ 중앙 출력 */}
      {!showMessage ? (
        <>
          {!hideIntroText && (
            <>
              <div className="text-[40px] sm:text-[50px] md:text-[55px] lg:text-[60px] font-bold leading-relaxed">
                <span className="text-[#4FA65B]">꼬리콥터</span>를<br />
              </div>
              <div className="mt-[-20px] text-[40px] sm:text-[50px] md:text-[55px] lg:text-[60px] font-bold leading-relaxed">
                흔들어주세요!
              </div>
            </>
          )}
          {hasInteracted && (
            <div className="text-[130px] sm:text-[140px] md:text-[150px] lg:text-[160px] font-extrabold leading-relaxed text-[#232323] mt-4">
              {count}
            </div>
          )}
        </>
      ) : (
        <div className="text-[130px] sm:text-[140px] md:text-[150px] lg:text-[160px] font-extrabold leading-relaxed text-[#232323]">
          {score}
        </div>
      )}

      {/* 슬라이더 */}
      <CustomSlider value={sliderValue} onChange={handleSliderChange} />
    </div>
  );
};

export default Koricopter;
