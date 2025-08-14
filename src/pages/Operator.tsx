import { useState } from 'react';
import { BsStopCircleFill } from 'react-icons/bs';
import { CgPlayPauseO } from 'react-icons/cg';
import { MdWaterDrop } from 'react-icons/md';
import EndButton from './EndButton';
import StopButton from './StopButton';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  walkRecordIdState,
  walkDistanceMetersState,
  walkStartedAtState,
  walkPathCoordinatesState,
  walkPausedState,
  mapCaptureImageState,
} from '../hooks/walkAtoms';
import { endWalk, updateWalkStatus } from '../services/walks';
import { IoPlayCircle } from "react-icons/io5";
import Resister from '../hooks/Resister';
import Dimmer from '../hooks/Dimmer';

const Operator = ({ onMark, mapRef }: { onMark: () => void; mapRef?: any }) => {
  const [shadowModal1, setShowModal1] = useState(false);
  const [shadowModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const walkRecordId = useRecoilValue(walkRecordIdState);
  const distanceMeters = useRecoilValue(walkDistanceMetersState);
  const startedAt = useRecoilValue(walkStartedAtState);
  const pathCoordinates = useRecoilValue(walkPathCoordinatesState);
  const [paused, setPaused] = useRecoilState(walkPausedState);
  const setMapCaptureImage = useSetRecoilState(mapCaptureImageState);

  const handleConfirm = async () => {
    setShowModal(false);
    setShowModal1(false);

    if (!walkRecordId) {
      console.error('walkRecordId가 없습니다!');
      alert('산책 기록 ID가 없습니다. 산책을 다시 시작해주세요.');
      navigate('/');
      return;
    }

    if (mapRef?.current) {
      try {
        console.log('산책 종료 시 지도 캡처 시작...');
        const capturedImage = await mapRef.current.captureMap();
        if (capturedImage) {
          console.log('지도 캡처 성공, 이미지 저장');
          setMapCaptureImage(capturedImage);
        } else {
          console.log('지도 캡처 실패 - null 반환');
        }
      } catch (error) {
        console.error('지도 캡처 중 오류:', error);
      }
    } else {
      console.log('mapRef가 없어서 캡처 불가');
    }

    try {
      const durationSec = startedAt
        ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
        : 0;

      console.log('산책 종료 API 호출:', {
        walkRecordId,
        finalDurationSeconds: durationSec,
        finalDistanceMeters: Math.floor(distanceMeters),
        pathCoordinatesLength: pathCoordinates.length
      });

      const response = await endWalk(walkRecordId, {
        finalDurationSeconds: durationSec,
        finalDistanceMeters: Math.floor(distanceMeters),
        finalPathCoordinates: pathCoordinates,
      });

      console.log('산책 종료 성공:', response);
      navigate('/koricopter?result=yes');
    } catch (e) {
      console.error('산책 종료 실패:', e);
      alert('산책 종료에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setShowModal1(false);
    navigate('/koricopter?result=no');
  };

  const handlePauseConfirm = async () => {
    try {
      if (!walkRecordId) return;

      const next = !paused;

      // 🔥 깜빡임 방지: 먼저 UI 상태를 확정(오버레이 조건 즉시 만족)
      setPaused(next);
      setShowModal1(false);   // 모달은 그 다음에 닫음

      // 서버 반영 (실패 시 롤백)
      await updateWalkStatus(walkRecordId, { status: next ? 'PAUSED' : 'STARTED' });
    } catch (e) {
      // 실패 시 되돌리기
      setPaused(prev => !prev);
    }
  };

  const handlePauseClick = async () => {
    if (!walkRecordId) return;

    if (!paused) {
      // 진행 중 → 일시정지: 모달을 띄워서 확인 받기
      setShowModal1(true);
      return;
    }

    // 일시정지 상태 → 재시작: 모달 없이 즉시 처리
    try {
      setPaused(false); // 낙관적 업데이트로 깜빡임 방지
      await updateWalkStatus(walkRecordId, { status: 'STARTED' });
    } catch (e) {
      // 실패 시 롤백
      setPaused(true);
      console.error(e);
    }
  };

  return (
    <div className="relative w-screen h-[15vh]">

      {/* ✅ 모달 닫힌 뒤 + 일시정지 상태면 그림자만 유지 */}
      {paused && !shadowModal1 && <Dimmer opacity={0.4} z={5} />}

      {/* ✅ 일시정지 상태 배너 (화면 상단 중앙) */}
      {paused && (
        <div className="fixed top-[8vh] left-0 right-0 z-[60]">
          {/* Record와 동일한 외곽 규격: mx-7, border, rounded-4xl, p-3 */}
          <div className="mx-7 border border-gray-300 rounded-4xl p-4 bg-[#E6F5EA] text-[#1F7A3B]
                    text-base sm:text-lg md:text-xl lg:text-2xl shadow-md">
            <div className="flex items-center justify-center gap-3 px-4">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4FA65B] text-white leading-none">!</span>
              <span className="font-medium">현재 산책 일시정지 모드예요.</span>
            </div>
          </div>
        </div>
      )}

      {/* 하얀 박스 (하단 패널) */}
      <div className="absolute bottom-0 left-0 right-0 border border-gray-300 rounded-2xl bg-white h-[12vh] flex justify-around items-center px-4 z-10">
        {/* 왼쪽 버튼 */}
        <button
          onClick={handlePauseClick}
          className={`flex-1 flex flex-col items-center justify-center ${paused ? 'text-[#4FA65B] rounded-xl' : ''}`}
        >
          {paused ? (
            <IoPlayCircle className="w-[7vh] h-[7vh] text-[#4FA65B] cursor-pointer" />
          ) : (
            <CgPlayPauseO className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          )}
          <span
            className={`mt-[0.7vh] text-[1.5vh] font-semibold ${paused ? 'text-[#4FA65B]' : 'text-[#CCCCCC]'}`}
          >
            {paused ? '시작' : '일시정지'}
          </span>
        </button>

        <div className="flex-1 flex justify-center" /> {/* 가운데 공간 */}

        {/* 오른쪽 버튼 */}
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <BsStopCircleFill className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          <span className="mt-[0.7vh] text-[1.5vh] text-[#CCCCCC] font-semibold">
            종료
          </span>
        </button>

        {/* 가운데 마킹 버튼 */}
        <div className="absolute flex flex-col items-center top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            onClick={onMark}
            className={`flex flex-col items-center justify-center w/[10vh] w-[10vh] h-[10vh] rounded-full cursor-pointer
              ${paused ? 'bg-[#CCCCCC]' : 'bg-[#4FA65B]'}`}
          >
            <MdWaterDrop className="w-[5vh] h-[5vh] text-white" />
          </button>
          <span
            className={`mt-[0.5vh] text-[15px] font-bold ${paused ? 'text-[#9CA3AF]' : 'text-[#4FA65B]'}`}
          >
            마킹
          </span>
        </div>
      </div>

      {shadowModal && (
        <EndButton
          message="코스를 등록할까요?"
          subMessage={`이웃에게 나만의 산책 멍소가 공유됩니다.`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {shadowModal1 && (
        <StopButton
          subMessage={`일시정지 중 코스에서 멀리 이동하면\n꼬리콥터를 흔들 수 없어요.\n코스로 돌아와서 재시작 해주세요.`}
          onConfirm={handlePauseConfirm}
        />
      )}
    </div>
  );
};

export default Operator;
