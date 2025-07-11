import React from 'react';

type CustomSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

const CustomSlider = ({ value, onChange }: CustomSliderProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="fixed bottom-10 left-0 w-full flex flex-col items-center z-50">
      <div className="relative w-[300px]">
        {/* 슬라이더 바 */}
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={handleChange}
          className="w-full h-2 rounded-full appearance-none bg-[#4FA65B]"
        />
        {/* 움직이는 하얀 원 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-[#4FA65B] rounded-full pointer-events-none"
          style={{
            left: `calc(${value}% - 12px)`,
          }}
        />
      </div>

      {/* 안내 문구 */}
      <p className="mt-3 text-sm text-gray-500">슬라이더를 좌우로 움직이세요</p>
    </div>
  );
};

export default CustomSlider;
