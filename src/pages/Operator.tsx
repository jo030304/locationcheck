import { useState, useMemo } from 'react';
import { BsStopCircleFill } from 'react-icons/bs';
import { CgPlayPauseO } from 'react-icons/cg';
import { MdWaterDrop } from 'react-icons/md';
import { IoPlayCircle } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';

import EndButton from './EndButton';
import StopButton from './StopButton';
import Dimmer from '../hooks/Dimmer';

import {
  walkRecordIdState,
  walkDistanceMetersState,
  walkStartedAtState,
  walkPathCoordinatesState,
  walkPausedState,
  mapCaptureImageState,
} from '../hooks/walkAtoms';
import { endWalk, updateWalkStatus } from '../services/walks';

type EndModalOptions = {
  message?: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
};

type Props = {
  onMark: () => void;
  mapRef?: any;
  /** Walk_existing = true(일시정지 확인 모달 필요), Walk_new = false */
  confirmOnPause?: boolean;
  /** 종료 모달 카피(페이지별 커스텀) */
  endModal?: EndModalOptions;

  /** ✅ 선택: 종료 모달 '확인(=계속하기)' 동작 오버라이드 (Walk_existing에서만 사용) */
  onEndConfirmOverride?: () => void | Promise<void>;
  /** ✅ 선택: 종료 모달 '취소(=종료하기)' 동작 오버라이드 (Walk_existing에서만 사용) */
  onEndCancelOverride?: () => void | Promise<void>;
};

const Operator = ({
  onMark,
  mapRef,
  confirmOnPause = false,
  endModal,
  onEndConfirmOverride,
  onEndCancelOverride,
}: Props) => {
  const navigate = useNavigate();

  // 종료/일시정지 모달
  const [showEndModal, setShowEndModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);

  // recoil
  const walkRecordId = useRecoilValue(walkRecordIdState);
  const distanceMeters = useRecoilValue(walkDistanceMetersState);
  const startedAt = useRecoilValue(walkStartedAtState);
  const pathCoordinates = useRecoilValue(walkPathCoordinatesState);
  const [paused, setPaused] = useRecoilState(walkPausedState);
  const setMapCaptureImage = useSetRecoilState(mapCaptureImageState);

  // ✅ 페이지별로 주입되는 문구 + 기본값
  const endCopy = useMemo(
    () => ({
      message: endModal?.message ?? '코스를 등록할까요?',
      subMessage: endModal?.subMessage ?? '이웃에게 나만의 산책 멍소가 공유됩니다.',
      confirmText: endModal?.confirmText ?? '예',
      cancelText: endModal?.cancelText ?? '아니요',
    }),
    [endModal]
  );

  /** -------------------- 종료(EndButton) - 기본 동작 -------------------- */
  const handleConfirmEnd = async () => {
    setShowEndModal(false);

    if (!walkRecordId) {
      console.error('walkRecordId가 없습니다!');
      alert('산책 기록 ID가 없습니다. 산책을 다시 시작해주세요.');
      navigate('/');
      return;
    }

    // 지도 캡처
    if (mapRef?.current) {
      try {
        const capturedImage = await mapRef.current.captureMap();
        if (capturedImage) setMapCaptureImage(capturedImage);
      } catch (error) {
        console.error('지도 캡처 중 오류:', error);
      }
    }

    try {
      const durationSec = startedAt ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000)) : 0;

      await endWalk(walkRecordId, {
        finalDurationSeconds: durationSec,
        finalDistanceMeters: Math.floor(distanceMeters),
        finalPathCoordinates: pathCoordinates,
      });

      navigate('/koricopter?result=yes');
    } catch (e) {
      console.error('산책 종료 실패:', e);
      alert('산책 종료에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleCancelEnd = () => {
    setShowEndModal(false);
    navigate('/koricopter?result=no');
  };

  /** -------------------- 일시정지/재시작 -------------------- */
  const setServerStatus = async (next: 'PAUSED' | 'STARTED') => {
    if (!walkRecordId) return;
    try {
      await updateWalkStatus(walkRecordId, { status: next });
    } catch (e) {
      setPaused((prev) => !prev); // 실패 시 롤백
      console.error(e);
    }
  };

  const handlePauseConfirm = async () => {
    setShowPauseModal(false);
    setPaused(true);
    await setServerStatus('PAUSED');
  };

  const handlePauseClick = async () => {
    if (!walkRecordId) return;

    if (!paused) {
      // 진행 중 → 일시정지
      if (confirmOnPause) setShowPauseModal(true);
      else {
        setPaused(true);
        await setServerStatus('PAUSED');
      }
    } else {
      // 일시정지 → 재시작
      setPaused(false);
      await setServerStatus('STARTED');
    }
  };

  /** -------------------- 렌더 -------------------- */
  return (
    <div className="relative w-screen h-[15vh]">
      {/* 일시정지 상태이면 디밍 + 배너(모달 떠 있으면 숨김) */}
      {paused && !showPauseModal && <Dimmer opacity={0.4} z={5} />}

      {paused && !showPauseModal && (
        <div className="fixed top-[8vh] left-0 right-0 z-[60]">
          <div className="mx-7 border border-gray-300 rounded-4xl p-4 bg-[#E6F5EA] text-[#1F7A3B] shadow-md">
            <div className="flex items-center justify-center gap-3 px-4">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4FA65B] text-white leading-none">!</span>
              <span className="font-medium">현재 산책 일시정지 모드예요.</span>
            </div>
          </div>
        </div>
      )}

      {/* 하단 컨트롤 바 */}
      <div className="absolute bottom-0 left-0 right-0 border border-gray-300 rounded-2xl bg-white h-[12vh] flex justify-around items-center px-4 z-10">
        {/* 왼쪽: 일시정지/시작 */}
        <button onClick={handlePauseClick} className={`flex-1 flex flex-col items-center justify-center ${paused ? 'text-[#4FA65B]' : ''}`}>
          {paused ? (
            <IoPlayCircle className="w-[7vh] h-[7vh] text-[#4FA65B] cursor-pointer" />
          ) : (
            <CgPlayPauseO className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          )}
          <span className={`mt-[0.7vh] text-[1.5vh] font-semibold ${paused ? 'text-[#4FA65B]' : 'text-[#CCCCCC]'}`}>
            {paused ? '시작' : '일시정지'}
          </span>
        </button>

        <div className="flex-1 flex justify-center" />

        {/* 오른쪽: 종료 → EndButton 모달 */}
        <button onClick={() => setShowEndModal(true)} className="flex-1 flex flex-col items-center justify-center">
          <BsStopCircleFill className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          <span className="mt-[0.7vh] text-[1.5vh] text-[#CCCCCC] font-semibold">종료</span>
        </button>

        {/* 가운데: 마킹 */}
        <div className="absolute flex flex-col items-center top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            onClick={onMark}
            className={`flex flex-col items-center justify-center w/[10vh] w-[10vh] h-[10vh] rounded-full cursor-pointer ${
              paused ? 'bg-[#CCCCCC] cursor-not-allowed' : 'bg-[#4FA65B]'
            }`}
            disabled={paused}
          >
            <MdWaterDrop className="w-[5vh] h-[5vh] text-white" />
          </button>
          <span className={`mt-[0.5vh] text-[15px] font-bold ${paused ? 'text-[#9CA3AF]' : 'text-[#4FA65B]'}`}>마킹</span>
        </div>
      </div>

      {/* 종료 확인 모달 */}
      {showEndModal && (
        <EndButton
          message={endCopy.message}
          subMessage={endCopy.subMessage}
          confirmText={endCopy.confirmText}  // ex) '계속하기'
          cancelText={endCopy.cancelText}    // ex) '종료하기'
          onConfirm={async () => {
            setShowEndModal(false);
            if (onEndConfirmOverride) {
              await onEndConfirmOverride();
            } else {
              await handleConfirmEnd();
            }
          }}
          onCancel={async () => {
            setShowEndModal(false);
            if (onEndCancelOverride) {
              await onEndCancelOverride();
            } else {
              handleCancelEnd();
            }
          }}
        />
      )}

      {/* 일시정지 안내 모달 (Walk_existing에서만 confirmOnPause=true로 사용) */}
      {showPauseModal && (
        <StopButton
          subMessage={`일시정지 중 코스에서 멀리 이동하면\n꼬리콥터를 흔들 수 없어요.\n코스로 돌아와서 재시작 해주세요.`}
          onConfirm={handlePauseConfirm}
        />
      )}
    </div>
  );
};

export default Operator;
