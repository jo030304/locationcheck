import React, { useState, useEffect } from 'react';
import Save from './Save';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import {
  tailcopterScoreState,
  walkDistanceMetersState,
  walkRecordIdState,
  walkMarkingCountState,
  mapCaptureImageState,
} from '../hooks/walkAtoms';
import { saveWalkDiary } from '../services/walks';
import { createPresignedUrl, uploadToS3 } from '../services/upload';

const Walk_record_after_walk = () => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const navigate = useNavigate();
  const walkRecordId = useRecoilValue(walkRecordIdState);
  const distanceMeters = useRecoilValue(walkDistanceMetersState);
  const score = useRecoilValue(tailcopterScoreState) ?? 0;
  const markingCount = useRecoilValue(walkMarkingCountState);
  const mapCaptureImage = useRecoilValue(mapCaptureImageState);
  const setMapCaptureImage = useSetRecoilState(mapCaptureImageState);
  const name = useRecoilValue(nameState);

  // 페이지 언마운트 시 이미지 초기화
  useEffect(() => {
    return () => {
      setMapCaptureImage(null);
    };
  }, [setMapCaptureImage]);

  const handleConfirm = async () => {
    setShowSaveModal(false);

    try {
      let pathImageUrl: string | undefined = undefined;

      // 캡처된 지도 이미지가 있으면 S3에 업로드
      if (mapCaptureImage && walkRecordId) {
        try {
          // Base64를 Blob으로 변환
          const base64Data = mapCaptureImage.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/png' });
          const file = new File([blob], 'map-capture.png', {
            type: 'image/png',
          });

          // Presigned URL 생성
          const presignedRes = await createPresignedUrl({
            fileName: 'map-capture.png',
            fileType: 'image/png',
            uploadType: 'course_cover',
          });

          const data = presignedRes?.data ?? presignedRes;
          const uploadUrl = data?.data?.uploadUrl || data?.uploadUrl;
          const fileUrl = data?.data?.fileUrl || data?.fileUrl;

          if (uploadUrl) {
            // S3에 업로드
            await uploadToS3(uploadUrl, file);
            pathImageUrl = fileUrl;
            console.log('지도 이미지 S3 업로드 완료:', pathImageUrl);
          }
        } catch (uploadError) {
          console.error('지도 이미지 업로드 실패:', uploadError);
        }
      }

      const activeId = (() => {
        if (walkRecordId) return walkRecordId;
        try {
          const ss = sessionStorage.getItem('active_walk_record_id');
          if (ss) return ss;
        } catch {}
        return null;
      })();

      if (activeId) {
        await saveWalkDiary(activeId, {
          title: null,
          walkDate: null,
          pathImageUrl: pathImageUrl || null,
          distanceMeters: Math.floor(distanceMeters),
          markingCount: Math.floor(markingCount),
          tailcopterScore: score,
        });
        console.log('산책 일지 저장 완료, pathImageUrl:', pathImageUrl);
      }
    } catch (e) {
      console.error('산책 일지 저장 실패:', e);
    }
    setIsSaved(true);
  };

  return (
    <div className="w-full h-screen max-w-sm mx-auto bg-[#FEFFFA] rounded-xl shadow-lg px-6 py-8 relative">
      {/* 닫기 버튼 */}
      <button
        onClick={() => navigate('/homepage')}
        className="absolute top-4 right-4 text-gray-400 text-xl font-bold cursor-pointer z-10"
      >
        ×
      </button>

      {/* 날짜 */}
      <p className="text-[22px] font-semibold mb-4">
        {new Date()
          .toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short',
          })
          .replace(/\. /g, '. ')
          .replace(/\.$/, '')}
      </p>

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
          <span className="text-[#4FA65B]">{name || '반려견'}</span>와 함께한
          오솔길 코스
        </p>
      </div>

      {/* 거리 / 마킹 / 점수 */}
      <div className="flex justify-around items-center text-center text-[14px] gap-6 mt-10 mb-10">
        <div>
          <p className="text-[#616160] mb-2">산책 거리</p>
          <p className="font-semibold text-[16px]">
            {(distanceMeters / 1000).toFixed(2)}km
          </p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">마킹 횟수</p>
          <p className="font-semibold text-[16px]">{markingCount}회</p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">꼬리 점수</p>
          <p className="font-semibold text-[16px]">{Math.round(score)}점</p>
        </div>
      </div>

      {/* 지도 이미지 표시 (원본 비율 유지) */}
      <div className="mt-6">
        <div className="w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
          {mapCaptureImage ? (
            <img
              src={mapCaptureImage}
              alt="산책 경로"
              className="w-full h-auto object-contain"
              onError={(e) => {
                console.error('이미지 표시 오류');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
              draggable={false}
            />
          ) : (
            <div className="w-full min-h-[30vh] grid place-items-center text-center">
              <div>
                <span className="text-gray-500 text-sm">
                  지도 이미지가 없습니다
                </span>
                <p className="text-gray-400 text-xs mt-2">
                  산책 종료 시 지도가 캡처되지 않았습니다
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-6 bg-white">
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={isSaved}
          className={`w-full py-3 rounded-xl text-[16px] font-semibold ${
            isSaved
              ? 'bg-gray-400 text-white cursor-default'
              : 'bg-[#4FA65B] text-white cursor-pointer'
          }`}
        >
          {isSaved ? '등록 완료' : '산책일지 저장하기'}
        </button>
      </div>

      {/* Save 모달 */}
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
