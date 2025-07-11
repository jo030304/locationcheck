import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlArrowLeft } from 'react-icons/sl';
import { FaSearch } from 'react-icons/fa';

const My_profile = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('까미');
  const [breed, setBreed] = useState('닥스훈트');
  const [birth, setBirth] = useState('241110');
  const [size, setSize] = useState<'소형' | '중형' | '대형'>('소형');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-md mx-auto p-4 font-pretendard">
      {/* 상단 헤더 */}
      <div className="relative flex items-center justify-center mb-6">
        <SlArrowLeft
          onClick={() => navigate(-1)}
          className="absolute left-0 text-2xl text-[#ADADAD] cursor-pointer"
        />
        <h1 className="text-[19px] font-medium text-[#232323]">프로필</h1>
        <button
          className="absolute right-0 text-sm text-[#498952] border border-[#498952] px-3 py-1 rounded-full"
          onClick={handleSave}
        >
          완료
        </button>
      </div>

      {/* 저장 메시지 */}
      {saved && (
        <div className="mb-4 text-sm text-[#498952] bg-[#E0F2D9] rounded-md py-2 px-4 text-center">
          ✅ 변경사항이 저장되었어요.
        </div>
      )}

      {/* 프로필 이미지 */}
      <div className="flex justify-center mb-6">
        <div className="w-40 h-40 rounded-full bg-gray-100 flex items-center justify-center border border-[#CCCCCC] overflow-hidden">
          <img
            src="/기본 마이 프로필.png"
            alt="profile"
            className="w-[120px] h-[120px] object-contain"
          />
        </div>
      </div>

      {/* 이름 */}
      <div className="mb-4">
        <label className="block text-[16px] text-[#232323] font-medium mb-1">
          이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border border-[#CCCCCC] rounded-md text-[16px]"
        />
      </div>

      {/* 견종 */}
      <div className="mb-4">
        <label className="block text-[16px] text-[#232323] font-medium mb-1">
          견종
        </label>
        <div className="relative">
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className="w-full p-3 border border-[#CCCCCC] rounded-md text-[16px] pr-10"
          />
          <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* 생년월일 */}
      <div className="mb-6">
        <label className="block text-[16px] text-[#232323] font-medium mb-1">
          생년월일
        </label>
        <input
          type="text"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
          className="w-full p-3 border border-[#CCCCCC] rounded-md text-[16px]"
          placeholder="YYMMDD"
        />
      </div>

      {/* 크기 선택 */}
      <div className="mb-2">
        <label className="block text-[16px] text-[#232323] font-medium mb-2">
          크기
        </label>
        <div className="flex gap-2">
          {[
            { label: '소형', desc: '1~10kg' },
            { label: '중형', desc: '10~25kg' },
            { label: '대형', desc: '25kg 이상' },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setSize(option.label as '소형' | '중형' | '대형')}
              className={`flex-1 p-2 text-sm border rounded-md transition
                ${
                  size === option.label
                    ? 'bg-[#E0F2D9] border-[#498952] text-[#498952]'
                    : 'border-[#CCCCCC] text-[#232323]'
                }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-[#ADADAD]">({option.desc})</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default My_profile;
