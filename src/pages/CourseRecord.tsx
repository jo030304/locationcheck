// CourseRecord.tsx
import React from 'react';

type Props = {
  /** 현재 이동한 거리 (m) */
  distance: number;
  /** 코스 이름 */
  courseName: string;
  /** 코스 총 거리 (m) */
  totalDistanceMeters: number;
  /** 필요하면 외부에서 여백/위치 조절 */
  className?: string;
};

/** 상단 녹색 배너: 코스명 | (현재 거리 | 전체 거리) */
const CourseRecord: React.FC<Props> = ({
  distance,
  courseName,
  totalDistanceMeters,
  className = '',
}) => {
  // ✅ undefined/NaN/음수일 때 0으로 처리 → 항상 0.00km부터 표시
  const toKm2 = (m: unknown) => (Math.max(0, Number(m) || 0) / 1000).toFixed(2);

  return (
    <div
      className={`mx-7 border border-gray-300 rounded-4xl p-3 bg-[#4FA65B] text-white 
                  text-base sm:text-lg md:text-xl lg:text-2xl ${className}`}
    >
      <div className="flex items-center justify-between px-4">
        {/* 왼쪽: 코스명 */}
        <span className="whitespace-nowrap font-semibold truncate">
          {courseName || '코스명'}
        </span>

        {/* 오른쪽: (현재 | 전체) */}
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-semibold">{toKm2(distance)}km</span>
          <span className="text-white opacity-60">|</span>
          <span className="font-semibold">{toKm2(totalDistanceMeters)}km</span>
        </div>
      </div>
    </div>
  );
};

export default CourseRecord;
