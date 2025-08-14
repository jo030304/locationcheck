import { useEffect, useRef, useState, useCallback } from 'react';
import KakaoMap from './KakaoMap';
import Record from './Record';
import Operator from './Operator';
import StopButton from './StopButton';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  walkDistanceMetersState,
  walkRecordIdState,
  walkStartedAtState,
  walkMarkingCountState,
  walkPathCoordinatesState,
  currentLocationState,
} from '../hooks/walkAtoms';
import {
  endWalk,
  saveTailcopterScore,
  updateWalkTrack,
} from '../services/walks';
import { createPresignedUrl, uploadToS3 } from '../services/upload';
import { useNavigate } from 'react-router-dom';
import { createMarkingPhoto } from '../services/marking';


const Walk_new = () => {
  const navigate = useNavigate();
  const [markRequested, setMarkRequested] = useState(false);
  const [distance, setDistance] = useRecoilState(walkDistanceMetersState);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [virtualPosition, setVirtualPosition] = useState<{ lat: number; lng: number } | null>(null);
  const walkRecordId = useRecoilValue(walkRecordIdState);
  const startedAt = useRecoilValue(walkStartedAtState);
  const pathRef = useRef<number[][]>([]);
  const mapRef = useRef<any>(null);
  const [markingCount, setMarkingCount] = useRecoilState(walkMarkingCountState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pathCoordinates, setPathCoordinates] = useRecoilState(
    walkPathCoordinatesState
  );
  const currentLocation = useRecoilValue(currentLocationState);

  // 테스트용 가상 이동 함수
  const handleVirtualMove = () => {
    if (!mapRef.current) return;

    // 기준 위치 결정 (가상 위치가 있으면 그것을, 없으면 현재 위치 사용)
    let basePos;
    if (virtualPosition) {
      basePos = virtualPosition;
    } else {
      basePos = mapRef.current.getCurrentPosition();
      if (!basePos || basePos.lat === 0) {
        // 현재 위치가 없으면 기본값 사용
        basePos = currentLocation || { lat: 37.5665, lng: 126.9780 };
      }
    }

    // 남쪽으로 50미터 이동 (위도 감소)
    // 1도 ≈ 111km, 50m ≈ 0.00045도
    const newLat = basePos.lat - 0.00045;
    const newLng = basePos.lng;

    console.log('🚶 가상 이동 실행:', {
      from: { lat: basePos.lat.toFixed(6), lng: basePos.lng.toFixed(6) },
      to: { lat: newLat.toFixed(6), lng: newLng.toFixed(6) },
      distance: '약 50m 남쪽'
    });

    // 테스트 모드 활성화
    setTestMode(true);
    setVirtualPosition({ lat: newLat, lng: newLng });

    // KakaoMap의 위치 업데이트
    if (mapRef.current.updatePosition) {
      console.log('📍 updatePosition 호출');
      mapRef.current.updatePosition(newLat, newLng);
    } else {
      console.error('❌ updatePosition 메서드가 없습니다');
    }

    // 경로 업데이트
    handlePathUpdate({ lat: newLat, lng: newLng });

    // 3초 후 테스트 모드 해제
    setTimeout(() => {
      setTestMode(false);
      console.log('✅ 테스트 모드 해제');
    }, 3000);
  };

  // onPathUpdate 콜백 메모이제이션
  const handlePathUpdate = useCallback((c: { lat: number; lng: number }) => {
    pathRef.current.push([c.lat, c.lng]);
    setPathCoordinates((prev) => [...prev, [c.lat, c.lng]]);
  }, [setPathCoordinates]);

  // 주기적으로 서버에 경로 업데이트
  useEffect(() => {
    const iv = setInterval(() => {
      if (!walkRecordId || pathRef.current.length === 0) return;
      const durationSec = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : Math.floor(distance / 1); // fallback
      updateWalkTrack(walkRecordId, {
        currentPathCoordinates: pathRef.current,
        currentDistanceMeters: Math.floor(distance),
        currentDurationSeconds: durationSec,
      }).catch(() => { });
    }, 4000);
    return () => clearInterval(iv);
  }, [walkRecordId, startedAt, distance]);

  return (
    <div>
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={async () => {
          setMarkRequested(false);
          // 파일 선택 트리거
          fileInputRef.current?.click();
        }}
        drawingEnabled={true}
        onDistanceChange={(d) => setDistance(d)}
        walkId={walkRecordId || 'unknown'}
        onPathUpdate={handlePathUpdate}
        ref={mapRef}
        initialPosition={currentLocation}
        testMode={testMode}
      >
        <Record distance={distance} />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator onMark={() => setMarkRequested(true)} mapRef={mapRef} />
        </div>

        {/* 테스트용 가상 이동 버튼 (개발 환경에서만 표시) */}
        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleVirtualMove}
            className={`absolute top-20 right-4 px-3 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${testMode
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            disabled={testMode}
          >
            {testMode ? '이동 중...' : 'TEST: 남쪽 50m'}
          </button>
        )}
      </KakaoMap>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const inputElement = e.currentTarget; // input element 참조 저장
          if (!file) return;
          try {
            const pos = mapRef.current?.getCurrentPosition?.();
            const lat = pos?.lat;
            const lng = pos?.lng;
            if (!walkRecordId || lat == null || lng == null) return;

            const pre = await createPresignedUrl({
              fileName: file.name,
              fileType: (file.type as any) || 'image/jpeg',
              uploadType: 'marking',
            });
            const d = (pre as any)?.data ?? pre;
            const uploadUrl = d?.data?.uploadUrl || d?.uploadUrl;
            const fileUrl = d?.data?.fileUrl || d?.fileUrl;
            if (uploadUrl) await uploadToS3(uploadUrl, file);
            if (fileUrl) {
              const savedRes = await createMarkingPhoto({
                walkRecordId,
                latitude: lat,
                longitude: lng,
                photoUrl: fileUrl,
              });
              setMarkingCount((c) => c + 1);

              // ✅ 방금 찍은 사진을 포토존 페이지에 넘김 (미리보기 URL도 함께)
              const previewUrl = URL.createObjectURL(file);
              // 백엔드 응답에서 id 추출 (data 래핑/비래핑 모두 대비)
              const saved = (savedRes as any)?.data ?? savedRes;
              const markingPhotoId =
                saved?.id || saved?.markingPhotoId || saved?.data?.id || undefined;

              const payload = {
                fileUrl,
                previewUrl,
                lat,
                lng,
                ts: Date.now(),
                markingPhotoId, // ✅ 추가: 저장된 마킹 사진 id
              };
              sessionStorage.setItem('last_marking_photo', JSON.stringify(payload)); // 새로고침 대비

              // ✅ 로컬 히스토리 저장 (중복 방지)
              try {
                const KEY = 'marking_photos';
                const item = {
                  fileUrl,
                  lat,
                  lng,
                  ts: payload.ts,
                  markingPhotoId,
                };
                const prev: any[] = JSON.parse(localStorage.getItem(KEY) || '[]');
                const exists = prev.some((p) =>
                  (markingPhotoId && p.markingPhotoId === markingPhotoId) ||
                  (!markingPhotoId && p.fileUrl === fileUrl && p.ts === payload.ts)
                );
                const next = exists ? prev : [item, ...prev].slice(0, 200);
                localStorage.setItem(KEY, JSON.stringify(next));
              } catch { }

              navigate('/marking_photozone', { state: payload });
            }
          } catch (err) {
            console.error('마킹 업로드 실패:', err);
          } finally {
            if (inputElement) {
              inputElement.value = '';
            }
          }
        }}
      />
    </div>
  );
};

export default Walk_new;
