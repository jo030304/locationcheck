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

  // testMode는 유지하되, 버튼은 testMode와 관계없이 항상 동작/표시
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

  // onPathUpdate 콜백 메모이제이션
  const handlePathUpdate = useCallback((c: { lat: number; lng: number }) => {
    pathRef.current.push([c.lat, c.lng]);
    setPathCoordinates((prev) => [...prev, [c.lat, c.lng]]);
  }, [setPathCoordinates]);

  // 기준 위치 가져오기
  const getBasePosition = useCallback((): { lat: number; lng: number } => {
    const fallback = currentLocation ?? { lat: 37.5665, lng: 126.9780 };
    const fromMap = mapRef.current?.getCurrentPosition?.();
    const base = virtualPosition ?? fromMap ?? fallback;
    if (!base || base.lat == null || base.lng == null) return fallback;
    return base;
  }, [virtualPosition, currentLocation]);

  // 위/경도 50m 이동 유틸 (북=+50, 남=-50, 동=+50, 서=-50)
  const moveByMeters = useCallback((northMeters: number, eastMeters: number) => {
    const base = getBasePosition();
    const latRad = (base.lat * Math.PI) / 180;
    const dLat = northMeters / 111_000; // 위도 1도 ≈ 111km
    const denom = Math.max(Math.cos(latRad) * 111_000, 1e-6); // 경도 변환 안전값
    const dLng = eastMeters / denom;

    const newLat = base.lat + dLat;
    const newLng = base.lng + dLng;

    setVirtualPosition({ lat: newLat, lng: newLng });

    if (mapRef.current?.updatePosition) {
      mapRef.current.updatePosition(newLat, newLng);
    } else {
      console.error('❌ updatePosition 메서드가 없습니다');
    }

    handlePathUpdate({ lat: newLat, lng: newLng });
  }, [getBasePosition, handlePathUpdate]);

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

        {/* ✅ 방향 이동 패널 (항상 표시) */}
        <div className="absolute top-20 right-4 z-50">
          <div className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow p-2">
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                type="button"
                className="w-9 h-9 rounded-lg border shadow text-sm font-medium"
                onClick={() => moveByMeters(50, 0)}
                title="북쪽으로 50m"
              >
                N
              </button>
              <div />

              <button
                type="button"
                className="w-9 h-9 rounded-lg border shadow text-sm font-medium"
                onClick={() => moveByMeters(0, -50)}
                title="서쪽으로 50m"
              >
                W
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-lg border shadow text-sm font-medium"
                onClick={() => moveByMeters(-50, 0)}
                title="남쪽으로 50m"
              >
                S
              </button>
              <button
                type="button"
                className="w-9 h-9 rounded-lg border shadow text-sm font-medium"
                onClick={() => moveByMeters(0, 50)}
                title="동쪽으로 50m"
              >
                E
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator
            onMark={() => setMarkRequested(true)}
            mapRef={mapRef}
            confirmOnPause={false}
            endModal={{
              message: '코스를 등록할까요?',
              subMessage: '이웃에게 나만의 산책 멍소가 공유됩니다.',
              confirmText: '예',
              cancelText: '아니요',
            }}
          />
        </div>
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
