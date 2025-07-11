import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 추가
import { SlArrowLeft } from 'react-icons/sl';
const course_create_detail = () => {
  const navigate = useNavigate(); // 추가

  const [courseName, setCourseName] = useState('');
  const [courseFeature, setCourseFeature] = useState('');
  const [difficulty, setDifficulty] = useState<'상' | '중' | '하' | null>(null);
  const [dogSize, setDogSize] = useState<'소형' | '중형' | '대형' | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!courseName || !courseFeature || !difficulty || !dogSize) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    // 등록 로직
    console.log({
      courseName,
      courseFeature,
      difficulty,
      dogSize,
      coverImage,
    });

    navigate("/walk_record_after_walk");
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="relative mb-6 flex items-center justify-center">
        {/* 뒤로가기 버튼 (왼쪽) */}
        <SlArrowLeft
          onClick={() => navigate(-1)}
          className="absolute left-0 text-2xl text-[#ADADAD] cursor-pointer"
        />

        {/* 중앙 타이틀 */}
        <h1 className="font-pretendard text-[19px] font-medium text-center text-[#232323]">
          코스 등록하기
        </h1>
      </div>

      {/* 커버 이미지 */}
      <div className="mb-4">
        <label className="font-pretendard text-base font-medium text-[#232323]">
          커버 이미지
        </label>

        {coverImage ? (
          <img
            src={coverImage}
            alt="커버 이미지"
            className="rounded-xl w-full border border-[#CCCCCC] h-40 object-cover"
          />
        ) : (
          <label className="flex items-center justify-center border border-[#CCCCCC] rounded-xl w-full h-40 bg-gray-100 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <span className="text-gray-500 text-2xl">📷</span>
          </label>
        )}
      </div>
      {/* 거리 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스 거리</label>
        <input
          type="text"
          value="1.08KM"
          readOnly
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 코스명 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스명</label>
        <input
          type="text"
          placeholder="코스명을 입력해주세요. (최대 10자)"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value.slice(0, 10))}
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 코스 특징 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스 특징</label>
        <input
          type="text"
          placeholder="코스 특징을 입력해주세요. (최대 3개)"
          value={courseFeature}
          onChange={(e) => setCourseFeature(e.target.value)}
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 난이도 선택 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">난이도</label>
        <div className="flex gap-2 mt-2">
          {['상', '중', '하'].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level as '상' | '중' | '하')}
              className={`flex-1 p-2 rounded-md border transition
        ${difficulty === level
                  ? 'bg-[#E0F2D9] border-[#498952] text-[#498952]'
                  : 'border-[#CCCCCC] text-[#232323] cursor-pointer'
                }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      {/* 추천 견종 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">추천 견종</label>
        <div className="flex gap-2 mt-2">
          {[
            { label: '소형', range: '1~10kg' },
            { label: '중형', range: '10~25kg' },
            { label: '대형', range: '25kg 이상' },
          ].map((dog) => (
            <button
              key={dog.label}
              onClick={() => setDogSize(dog.label as '소형' | '중형' | '대형')}
              className={`flex-1 p-2 rounded-md border text-sm transition
        ${dogSize === dog.label
                  ? 'bg-[#E0F2D9] border-[#498952] text-[#498952]'
                  : 'border-[#CCCCCC] text-[#232323] cursor-pointer'
                }`}
            >
              {dog.label}
              <br />({dog.range})
            </button>
          ))}
        </div>
      </div>
      {/* 등록 버튼 */}
      <button
        onClick={handleSubmit}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition cursor-pointer"
        style={{ backgroundColor: '#4fa65b' }}
      >
        등록하기
      </button>
    </div>
  );
};

export default course_create_detail;
