import React, { useState } from "react";
import Save from "./Save";
import { useNavigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { nameState } from "../atoms/animalInfoAtoms";

const Walk_record_after_walk = () => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false); // ✅ 추가
  const navigate = useNavigate();

  const handleConfirm = () => {
    setShowSaveModal(false);
    setIsSaved(true); // ✅ 저장 완료 상태 반영
  };

  const name = useRecoilValue(nameState);
  return (
    <div className="w-full h-screen max-w-sm mx-auto bg-[#FEFFFA] rounded-xl shadow-lg px-6 py-8 relative">
      {/* 닫기 버튼 */}
      <button
        onClick={() => navigate("/homepage")}
        className="absolute top-4 right-4 text-gray-400 text-xl font-bold cursor-pointer">×</button>

      {/* 날짜 */}
      <p className="text-[22px] font-semibold mb-4">2025. 05. 03 (토)</p>

      {/* 코스 제목 + 프로필 이미지 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <img
            src="/기본 프로필.png"
            alt="profile"
            className="w-6 h-6 object-contain"
          />
        </div>
        <p className="text-[17px] font-semibold">
          <span className="text-[#4FA65B]">{name || "반려견"}</span>와 함께한 오솔길 코스
        </p>
      </div>

      {/* 거리 / 마킹 / 점수 */}
      <div className="flex justify-around items-center text-center text-[14px] gap-6 mt-10 mb-10">
        <div>
          <p className="text-[#616160] mb-2">산책 거리</p>
          <p className="font-semibold text-[16px]">1.08km</p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">마킹 횟수</p>
          <p className="font-semibold text-[16px]">3회</p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">꼬리 점수</p>
          <p className="font-semibold text-[16px]">98점</p>
        </div>
      </div>

      {/* 지도 자리 */}
      <div className="bg-gray-200 rounded-xl w-full h-[250px] flex items-center justify-center mt-10">
        <span className="text-gray-500">지도 이미지</span>
      </div>

      {/* 저장 버튼 */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-6 bg-white">
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={isSaved} // ✅ 버튼 비활성화
          className={`w-full py-3 rounded-xl text-[16px] font-semibold ${isSaved
            ? "bg-gray-400 text-white cursor-default"
            : "bg-[#4FA65B] text-white cursor-pointer"
            }`}
        >
          {isSaved ? "등록 완료" : "산책일지 저장하기"} {/* ✅ 버튼 텍스트 변경 */}
        </button>
      </div>

      {/* ✅ Save 모달 */}
      {showSaveModal && (
        <Save
          message="저장 완료!"
          subMessage="산책일지가 성공적으로 저장되었습니다."
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default Walk_record_after_walk;
