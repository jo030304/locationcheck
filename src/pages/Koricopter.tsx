// Koricopter.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useId, type CSSProperties } from 'react';
import CustomSlider from '../hooks/CustomSlider';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tailcopterScoreState, walkRecordIdState } from '../hooks/walkAtoms';
import { saveTailcopterScore } from '../services/walks';
import { HiMiniHeart } from "react-icons/hi2";

/* ----------------------------- ScoreFX (정적 하트/물방울) ----------------------------- */
type Tier = 'low' | 'mid' | 'high';

// 아이콘 크기 전체 스케일 업
const ICON_SCALE = 1.35;

function HeartWithShine({
  style,
  size,
  color = '#FF6B91',
}: {
  style: CSSProperties;
  size: number;
  color?: string;
}) {
  const box: CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    ...style,
  };

  return (
    <div style={box}>
      {/* 원본 하트 아이콘 그대로 */}
      <HiMiniHeart
        size={size}
        color={color}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
      />

      {/* 내부 하이라이트: 왼쪽-윗부분 (강도 낮춤) */}
      <div
        style={{
          position: 'absolute',
          left: '18%',
          top: '12%',
          width: '30%',
          height: '30%',
          background:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0) 70%)',
          filter: 'blur(0.4px)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      {/* 외곽 글로우: 우하단 (강도 낮춤) */}
      <div
        style={{
          position: 'absolute',
          right: '-10%',
          bottom: '-12%',
          width: '95%',
          height: '95%',
          background:
            'radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0) 80%)',
          filter: 'blur(5px)',
          opacity: 0.28,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

/** 투명 배경 + 내부 하이라이트만(클립) */
function Drop({ style, color = '#6ECBFF' }: { style: CSSProperties; color?: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const shineId = `dropShine-${rawId}`;
  const innerId = `dropInner-${rawId}`;
  const pathId = `dropPath-${rawId}`;
  const clipId = `dropClip-${rawId}`;

  // width/height/scale 추출
  const toNum = (v: unknown) =>
    typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : undefined;

  const w = toNum(style?.width);
  const h = toNum(style?.height);
  const baseSize = w ?? h ?? 28;

  let scale = 1;
  if (typeof style?.transform === 'string') {
    const m = style.transform.match(/scale\(\s*([\d.]+)\s*\)/);
    if (m) scale = parseFloat(m[1]) || 1;
  }
  const effectiveSize = baseSize * scale;

  // 크기 → 진하기(투명도) 매핑 (커질수록 진하게)
  const MIN_SIZE = 20;
  const MAX_SIZE = 80;
  const MIN_OP = 0.55;
  const MAX_OP = 1.0;

  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const t = (clamp(effectiveSize, MIN_SIZE, MAX_SIZE) - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  const fillOpacity = MIN_OP + t * (MAX_OP - MIN_OP);

  const d =
    'M12 2c2.8 4.6 6.8 7.3 6.8 10.7A6.8 6.8 0 0 1 12 19.5 6.8 6.8 0 0 1 5.2 12.7C5.2 9.3 9.2 6.6 12 2z';

  return (
    // SVG 기본은 투명 배경 (배경 rect 없음)
    <svg width={w ?? 28} height={h ?? 28} viewBox="0 0 24 24" style={style}>
      <defs>
        {/* 물방울 Path 정의 + 클립패스 (바깥 번짐 방지 → 완전 투명 배경) */}
        <path id={pathId} d={d} />
        <clipPath id={clipId}>
          <use href={`#${pathId}`} xlinkHref={`#${pathId}`} />
        </clipPath>

        {/* 내부 하이라이트: 왼쪽-아랫부분 흰색→투명 (강도 절반) */}
        <radialGradient id={shineId} cx="0.28" cy="0.70" r="0.62">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.48" />
          <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* 내부 글로우(우하단으로 밝아짐) — 클립으로 모양 안에만 표시 */}
        <radialGradient id={innerId} cx="0.78" cy="0.88" r="0.95">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* 바탕색(크기에 따라 진해짐) */}
      <use href={`#${pathId}`} xlinkHref={`#${pathId}`} fill={color} fillOpacity={fillOpacity} />

      {/* 내부 하이라이트(만화풍) */}
      <use href={`#${pathId}`} xlinkHref={`#${pathId}`} fill={`url(#${shineId})`} />

      {/* 내부 글로우 (클립으로 path 내부에만 표시 → 배경 완전 투명) */}
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="24" height="24" fill={`url(#${innerId})`} />
      </g>
    </svg>
  );
}

function ScoreFX({
  active,
  tier,
  durationMs = 3000,
  heartColor = '#FF6B91',
  dropColor = '#6ECBFF',
}: {
  active: boolean;
  tier: Tier;
  durationMs?: number;
  heartColor?: string;
  dropColor?: string;
}) {
  const [on, setOn] = useState(false);

  // 점수 화면(active) 동안만 사진처럼 고정 표시
  useEffect(() => {
    if (!active) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), durationMs);
    return () => clearTimeout(t);
  }, [active, durationMs, tier]);

  if (!on || tier === 'mid') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {tier === 'high' && (
        <>
          <HeartWithShine
            size={25 * ICON_SCALE}
            color={heartColor}
            style={{
              position: 'absolute',
              top: 88,
              left: '20%',
              transform: 'rotate(-25deg)',
              transformOrigin: '50% 50%',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.12))',
            }}
          />
          <HeartWithShine
            size={55 * ICON_SCALE}
            color={heartColor}
            style={{
              position: 'absolute',
              top: 200,
              left: '10%',
              transform: 'rotate(25deg)',
              transformOrigin: '50% 50%',
              opacity: 0.9,
            }}
          />
          <HeartWithShine
            size={40 * ICON_SCALE}
            color={heartColor}
            style={{
              position: 'absolute',
              top: 200,
              right: '14%',
              transform: 'rotate(-15deg)',
              transformOrigin: '50% 50%',
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.12))',
            }}
          />
          <HeartWithShine
            size={50 * ICON_SCALE}
            color={heartColor}
            style={{
              position: 'absolute',
              top: 64,
              right: '20%',
              transform: 'rotate(15deg)',
              transformOrigin: '50% 50%',
              opacity: 0.85,
            }}
          />
          <HeartWithShine
            size={60 * ICON_SCALE}
            color={heartColor}
            style={{
              position: 'absolute',
              top: 300,
              right: '17%',
              transform: 'rotate(10deg)',
              transformOrigin: '50% 50%',
              opacity: 0.9,
            }}
          />
        </>
      )}

      {tier === 'low' && (
        <>
          <Drop
            style={{
              position: 'absolute',
              top: 88,
              right: '20%',
              width: 60,
              height: 60,
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.12))',
              transform: `scale(${ICON_SCALE})`,
              transformOrigin: 'center',
            }}
            color={dropColor}
          />
          <Drop
            style={{
              position: 'absolute',
              top: 280,
              right: '25%',
              width: 40,
              height: 40,
              filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.12))',
              transform: `scale(${ICON_SCALE})`,
              transformOrigin: 'center',
            }}
            color={dropColor}
          />
          <Drop
            style={{
              position: 'absolute',
              top: 64,
              left: '27%',
              width: 38,
              height: 38,
              opacity: 0.85,
              transform: `scale(${ICON_SCALE})`,
              transformOrigin: 'center',
            }}
            color={dropColor}
          />
          <Drop
            style={{
              position: 'absolute',
              top: 200,
              left: '14%',
              width: 35,
              height: 35,
              opacity: 0.9,
              transform: `scale(${ICON_SCALE})`,
              transformOrigin: 'center',
            }}
            color={dropColor}
          />
          <Drop
            style={{
              position: 'absolute',
              top: 300,
              left: '23%',
              width: 80,
              height: 80,
              opacity: 0.85,
              transform: `scale(${ICON_SCALE})`,
              transformOrigin: 'center',
            }}
            color={dropColor}
          />
        </>
      )}
    </div>
  );
}

/* ----------------------------- 메인 컴포넌트 ----------------------------- */

const LAYERS = 4; // 꼬리(메인) + 잔상 3

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
  const [hideIntroText, setHideIntroText] = useState(false);

  // 간단한 잔상: 최신 각도 히스토리
  const [angleHistory, setAngleHistory] = useState<number[]>(Array(LAYERS).fill(0));

  const score = Math.min(Math.round((count / 15) * 100), 100);
  const message =
    score <= 33 ? '다소 아쉬운 산책이었어요.' :
      score <= 66 ? '다음엔 더 신나게 놀아봐요!' :
        '아주 완벽했던 산책이었어요!';

  const tier: Tier = score <= 33 ? 'low' : score <= 66 ? 'mid' : 'high';

  // 메시지 4초 후 표시
  useEffect(() => {
    const msgTimer = setTimeout(() => setShowMessage(true), 4000);
    return () => clearTimeout(msgTimer);
  }, []);

  // 메시지 후 저장/네비
  const walkRecordId = useRecoilValue(walkRecordIdState);
  const [, setScoreState] = useRecoilState(tailcopterScoreState);
  useEffect(() => {
    if (!showMessage) return;
    setScoreState(score);
    if (walkRecordId) {
      saveTailcopterScore(walkRecordId, score).catch(() => {});
    }
    const navTimer = setTimeout(() => {
      if (result === 'yes') navigate('/course_create_detail');
      else if (result === 'no') navigate('/walk_record_after_walk');
    }, 3000);
    return () => clearTimeout(navTimer);
  }, [showMessage, result, navigate, score, setScoreState, walkRecordId]);

  // 슬라이더 → 각도 (초기 빠른 120ms 트랜지션 유지)
  const t = (sliderValue - 50) / 50; // -1..1
  const targetAngle = t * 24;
  useEffect(() => {
    setAngleHistory(prev => [targetAngle, ...prev].slice(0, LAYERS));
  }, [targetAngle]);

  const handleSliderChange = (val: number) => {
    setSliderValue(val);
    if (!hasInteracted) { setHasInteracted(true); setHideIntroText(true); }
    if (showMessage) return;
    if (val <= 5) setLeftReached(true);
    if (val >= 95) setRightReached(true);
    if (leftReached && rightReached) {
      setCount(p => p + 1);
      setLeftReached(false); setRightReached(false);
    }
  };

  return (
    <div className="relative min-h-[100svh] overflow-hidden">
      {/* 바닥 그라데이션 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[25vh] z-0 bg-gradient-to-b from-transparent via-[#E7F8E7] to-[#D7F1D7]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[260px] z-0 bg-[radial-gradient(80%_120%_at_50%_100%,rgba(79,166,91,0.22),rgba(79,166,91,0.10)_35%,rgba(79,166,91,0)_70%)]" />

      {/* 점수별 이펙트 (메시지 뜰 때만, 정적) */}
      <ScoreFX active={showMessage} tier={tier} />

      {/* ✅ 점수 고정 오버레이 (showMessage일 때만 화면 중앙에 고정) */}
      {showMessage && (
        <div className="fixed left-1/2 top-[10%] -translate-x-1/2 z-[60] pointer-events-none">
          <div className="text-[130px] sm:text-[140px] md:text-[150px] lg:text-[160px] font-extrabold leading-none text-[#232323]">
            {score}
          </div>
        </div>
      )}

      {/* 꼬리 모션 스택 — 정중앙 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex justify-center">
        <div className="relative w-[180px] sm:w-[200px]">
          {angleHistory.map((ang, i) => {
            const influence = 1 - i * 0.18;
            const scale = 1 - i * 0.04;
            const opacity = i === 0 ? 1 : Math.max(0.12, 0.32 - i * 0.07);
            const blurPx = i === 0 ? 0 : 1.2 + i * 0.6;
            return (
              <img
                key={i}
                src="/꼬리 사진.png"
                alt="꼬리"
                draggable={false}
                className="absolute inset-x-0 bottom-0 w-full select-none"
                style={{
                  transformOrigin: '50% 100%',
                  transform: `rotate(${ang * influence}deg) scale(${scale})`,
                  transition: 'transform 120ms cubic-bezier(.22,.61,.36,1)',
                  opacity,
                  filter: blurPx ? `blur(${blurPx}px)` : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* 실제 내용 */}
      <div className="relative z-10 flex flex-col justify-center items-center h-full text-center px-4 py-6 pb-[140px] sm:pb-[160px]">
        {showMessage ? (
          <p className="text-[15px] sm:text-[20px] md:text-[25px] lg:text-[30px] leading-relaxed text-gray-700">
            {message}
          </p>
        ) : (
          !hideIntroText && (
            <p className="text-[15px] sm:text-[20px] md:text-[25px] lg:text-[30px] leading-relaxed text-gray-700">
              까미와 함께한 산책, 즐거웠나요?
            </p>
          )
        )}

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
              <div className="text-[130px] sm:text-[140px] md:text-[150px] lg:text-[160px] font-extrabold leading-relaxed text-[#232323]">
                {count}
              </div>
            )}
          </>
        ) : (
          // 🔇 오버레이로 점수를 띄우므로 여기서는 렌더링하지 않음
          null
        )}
        <div className="w-full flex justify-center">
          <div className="w-[75%] sm:w-[72%] max-w-[520px]">
            <CustomSlider value={sliderValue} onChange={handleSliderChange} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Koricopter;
