import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import KakaoMap from './KakaoMap';
import Operator from './Operator';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  walkDistanceMetersState,
  walkRecordIdState,
  walkStartedAtState,
  walkMarkingCountState,
  walkPathCoordinatesState,
  currentLocationState,
  mapCaptureImageState,
} from '../hooks/walkAtoms';
import { endWalk, updateWalkTrack } from '../services/walks';
import { createPresignedUrl, uploadToS3 } from '../services/upload';
import { createMarkingPhoto } from '../services/marking';
import { getCourseDetails } from '../services/courses';
import CourseRecord from './CourseRecord';

const RECORD_AFTER_PATH = '/walk_record_after_walk';

const Walk_existing = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  // ---- 거리/경로/식별자 Recoil ----
  const [distance, setDistance] = useRecoilState(walkDistanceMetersState);
  const [walkRecordId, setWalkRecordId] = useRecoilState(walkRecordIdState);
  const [startedAt, setStartedAt] = useRecoilState(walkStartedAtState);
  const [, setMarkingCount] = useRecoilState(walkMarkingCountState);
  const [, setPathCoordinates] = useRecoilState(walkPathCoordinatesState);
  const setMapCaptureImage = useSetRecoilState(mapCaptureImageState);

  // ---- 기타 상태 ----
  const [markRequested, setMarkRequested] = useState(false);
  const mapRef = useRef<any>(null);
  const pathRef = useRef<number[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- 위치/테스트 모드 ----
  const currentLocation = useRecoilValue(currentLocationState);
  const [testMode, setTestMode] = useState(false);
  const [virtualPosition, setVirtualPosition] =
    useState<{ lat: number; lng: number } | null>(null);

  // 출발 기준(앵커) (필요 시 확장용)
  const firstTrackRef = useRef<{ lat: number; lng: number } | null>(null);
  const initialFixRef = useRef<{ lat: number; lng: number } | null>(currentLocation ?? null);
  useEffect(() => {
    if (currentLocation && !initialFixRef.current) {
      initialFixRef.current = { lat: currentLocation.lat, lng: currentLocation.lng };
    }
  }, [currentLocation]);

  // ---- 코스 정보 ----
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const incomingCourse =
    location?.state?.course ??
    location?.state?.selectedCourse ??
    null;

  const incomingCourseId =
    location?.state?.courseId ??
    incomingCourse?.course_id ??
    incomingCourse?.id ??
    incomingCourse?.courseId ??
    null;

  const ssCourseRaw = typeof window !== 'undefined' ? sessionStorage.getItem('selected_course') : null;
  const ssCourseIdRaw = typeof window !== 'undefined' ? sessionStorage.getItem('selected_course_id') : null;
  const ssCourse = ssCourseRaw ? safeJsonParse(ssCourseRaw) : null;
  const ssCourseId = ssCourseIdRaw ?? (ssCourse?.course_id || ssCourse?.id || ssCourse?.courseId);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        if (incomingCourse && active) {
          setSelectedCourse(incomingCourse);
          return;
        }
        if (!incomingCourse && ssCourse && active) {
          setSelectedCourse(ssCourse);
          return;
        }

        const idToFetch = incomingCourseId || ssCourseId;
        if (idToFetch && active) {
          const res = await getCourseDetails(idToFetch);
          const data = (res as any)?.data ?? res;
          setSelectedCourse(data?.data ?? data ?? null);
        }
      } catch (e) {
        console.error('Failed to fetch course details:', e);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 새 산책 진입/변경 시 0부터 시작하도록 초기화 ---
  useEffect(() => {
    setDistance(0);
    setPathCoordinates([]);
    setMarkingCount(0);
    pathRef.current = [];
    firstTrackRef.current = null;
    // 자동완료 플래그도 리셋
    finishShownRef.current = false;
    if (!startedAt) setStartedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkRecordId]);

  // 상단 배너 카피
  const courseName = useMemo(() => {
    const c = selectedCourse;
    if (!c) return '';
    return (
      c?.data?.course_name ??
      c?.data?.course?.course_name ??
      c?.course_name ??
      c?.course?.course_name ??
      c?.courseName ??
      c?.name ??
      ''
    );
  }, [selectedCourse]);

  const totalDistanceMeters = useMemo(() => {
    const c = selectedCourse;
    if (!c) return 0;
    return (
      c?.data?.course_length_meters ??
      c?.data?.course?.course_length_meters ??
      c?.course_length_meters ??
      c?.course?.course_length_meters ??
      c?.courseLengthMeters ??
      0
    );
  }, [selectedCourse]);

  // ✅ 최소 진행거리: 전체 거리의 50%
  const MIN_PROGRESS_METERS = useMemo(
    () => (totalDistanceMeters > 0 ? totalDistanceMeters * 0.5 : Number.POSITIVE_INFINITY),
    [totalDistanceMeters]
  );

  // ✅ 전체 코스 경로(회색) 프리셋
  const basePath = useMemo(() => extractCoursePath(selectedCourse), [selectedCourse]);

  // ✅ 끝점은 저장된 경로의 마지막 좌표
  const finishLatLng = useMemo(() => {
    if (!basePath || basePath.length === 0) return null;
    const [lat, lng] = basePath[basePath.length - 1];
    return { lat, lng };
  }, [basePath]);

  // ✅ “산책 완료” 모달 상태 + 중복 방지 ref
  const [showFinishModal, setShowFinishModal] = useState(false);
  const finishShownRef = useRef(false);

  // ---- 경로 갱신 콜백 ----
  const handlePathUpdate = useCallback(
    (c: { lat: number; lng: number }) => {
      if (!firstTrackRef.current) firstTrackRef.current = { lat: c.lat, lng: c.lng };
      pathRef.current.push([c.lat, c.lng]);
      setPathCoordinates((prev) => [...prev, [c.lat, c.lng]]);
    },
    [setPathCoordinates]
  );

  // ---- 테스트: 가상 이동 ----
  const handleVirtualMove = () => {
    if (!mapRef.current) return;
    let basePos =
      virtualPosition ??
      mapRef.current.getCurrentPosition?.() ??
      currentLocation ?? { lat: 37.5665, lng: 126.9780 };

    const newLat = basePos.lat - 0.00045; // ≈ 50m
    const newLng = basePos.lng;

    setTestMode(true);
    setVirtualPosition({ lat: newLat, lng: newLng });

    if (mapRef.current.updatePosition) {
      mapRef.current.updatePosition(newLat, newLng);
    }
    handlePathUpdate({ lat: newLat, lng: newLng });

    setTimeout(() => setTestMode(false), 3000);
  };

  // ---- 주기적 경로 업로드 ----
  useEffect(() => {
    if (!walkRecordId) return;
    const iv = setInterval(() => {
      if (pathRef.current.length === 0) return;
      const durationSec = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : Math.floor(distance / 1);
      updateWalkTrack(walkRecordId, {
        currentPathCoordinates: pathRef.current,
        currentDistanceMeters: Math.floor(distance),
        currentDurationSeconds: durationSec,
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [walkRecordId, startedAt, distance]);

  // ---- (끝점 자동) 산책 종료 ----
  const handleEndWalk = async () => {
    // ✅ 최소 진행거리 미만이면 자동 종료 방지
    if (distance < MIN_PROGRESS_METERS) {
      finishShownRef.current = false;
      setShowFinishModal(false);
      return;
    }

    // 0) 모달/백드롭 먼저 숨김
    setShowFinishModal(false);
    // DOM 반영 대기
    await waitForPaint();
    await waitForPaint();

    // 1) 지도 스크린샷
    try {
      if (mapRef.current?.captureMap) {
        const capturedImage = await mapRef.current.captureMap();
        if (capturedImage) setMapCaptureImage(capturedImage);
      }
    } catch (capErr) {
      console.warn('Map capture failed (continuing anyway):', capErr);
    }

    // 2) 저장은 백그라운드로
    if (walkRecordId) {
      const durationSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      (async () => {
        try {
          await endWalk(walkRecordId, {
            finalDurationSeconds: durationSec,
            finalDistanceMeters: Math.floor(distance),
            finalPathCoordinates: pathRef.current,
          });
        } catch (e) {
          console.error('Failed to end walk (background):', e);
        }
      })();
    }

    // 3) 즉시 이동
    navigate('/koricopter?result=yes');
  };

  // ✅ 끝점 20m 이내 + 최소 진행거리(50%) 충족 시 모달
  useEffect(() => {
    if (!finishLatLng || !currentLocation) return;
    if (finishShownRef.current) return;

    if (distance < MIN_PROGRESS_METERS) return;

    const d = haversine(
      currentLocation.lat,
      currentLocation.lng,
      finishLatLng.lat,
      finishLatLng.lng
    );

    if (d <= 20) {
      finishShownRef.current = true;
      setShowFinishModal(true);
    }
  }, [currentLocation, finishLatLng, distance, MIN_PROGRESS_METERS]);

  // 모달 state 업데이트 반영 대기
  const waitForPaint = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  /** -------------------- Operator 종료 모달 오버라이드 (이 페이지에서만) -------------------- */
  // 계속하기(확인): 상태 유지 + 현재 위치로 카메라 이동
  const handleEndKeepWalking = useCallback(() => {
    mapRef.current?.moveToMyLocation?.();
  }, []);

  // 종료하기(취소): 모달/그림자 제거 후 스샷 → record_after 이동
  const handleEndToRecordAfter = useCallback(async () => {
    await waitForPaint();
    await waitForPaint();

    try {
      if (mapRef.current?.captureMap) {
        const capturedImage = await mapRef.current.captureMap();
        if (capturedImage) setMapCaptureImage(capturedImage);
      }
    } catch (capErr) {
      console.warn('Map capture on end (record_after) failed:', capErr);
    }

    navigate(RECORD_AFTER_PATH);
  }, [navigate, setMapCaptureImage]);

  return (
    <div>
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={async () => {
          setMarkRequested(false);
          fileInputRef.current?.click();
        }}
        drawingEnabled={true}
        onDistanceChange={(d) => setDistance(d)}
        walkId={walkRecordId || 'unknown'}
        onPathUpdate={handlePathUpdate}
        ref={mapRef}
        initialPosition={currentLocation}
        testMode={testMode}
        // ✅ 전체 코스(회색) 프리셋 경로 전달
        basePath={basePath}
        basePathOptions={{
          strokeColor: '#CCCCCC',
          strokeWeight: 5,
          strokeOpacity: 1,
          strokeStyle: 'solid',
        }}
      >
        {(courseName || totalDistanceMeters > 0) && (
          <CourseRecord
            distance={distance}
            courseName={courseName}
            totalDistanceMeters={totalDistanceMeters}
          />
        )}

        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator
            onMark={() => setMarkRequested(true)}
            mapRef={mapRef}
            confirmOnPause={true}
            endModal={{
              message: '산책을 종료할까요?',
              subMessage: '코스를 끝까지 마치지 않으면\n꼬리콥터를 흔들 수 없어요.',
              confirmText: '계속하기',
              cancelText: '종료하기',
            }}
            // ✅ 이 페이지에서만 동작 오버라이드
            onEndConfirmOverride={handleEndKeepWalking}
            onEndCancelOverride={handleEndToRecordAfter}
          />
        </div>

        {process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleVirtualMove}
            className={`absolute top-20 right-4 px-3 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${
              testMode ? 'bg-red-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={testMode}
          >
            {testMode ? '이동 중...' : 'TEST: 남쪽 50m'}
          </button>
        )}
      </KakaoMap>

      {/* 마킹 사진 업로드 인풋 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const inputElement = e.currentTarget;
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

              const previewUrl = URL.createObjectURL(file);
              const saved = (savedRes as any)?.data ?? savedRes;
              const markingPhotoId =
                saved?.id || saved?.markingPhotoId || saved?.data?.id || undefined;

              const payload = {
                fileUrl,
                previewUrl,
                lat,
                lng,
                ts: Date.now(),
                markingPhotoId,
              };
              sessionStorage.setItem('last_marking_photo', JSON.stringify(payload));

              try {
                const KEY = 'marking_photos';
                const item = { fileUrl, lat, lng, ts: payload.ts, markingPhotoId };
                const prev: any[] = JSON.parse(localStorage.getItem(KEY) || '[]');
                const exists = prev.some(
                  (p) =>
                    (markingPhotoId && p.markingPhotoId === markingPhotoId) ||
                    (!markingPhotoId &&
                      p.fileUrl === fileUrl &&
                      p.ts === payload.ts)
                );
                const next = exists ? prev : [item, ...prev].slice(0, 200);
                localStorage.setItem(KEY, JSON.stringify(next));
              } catch {}

              navigate('/marking_photozone', { state: payload });
            }
          } catch (err) {
            console.error('마킹 업로드 실패:', err);
          } finally {
            if (inputElement) inputElement.value = '';
          }
        }}
      />

      {/* ✅ 산책 완료 모달 */}
      {showFinishModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div className="bg-[#FEFFFA] rounded-2xl px-5 py-5 w-[309px] h-[182px] max-w-[90%] max-h-[90%] sm:w-[309px] sm:h-[182px] text-center shadow-xl flex flex-col justify-between">
            <div className="flex flex-col items-center flex-1 justify-center">
              <h3 className="text-[18px] font-bold">산책 완료!</h3>
              <p className="mt-2 text-sm text-[#616160] leading-tight whitespace-pre-line">
                {'목표한 코스를 모두 산책했어요.\n산책을 종료할게요.'}
              </p>
              <button
                type="button"
                onClick={handleEndWalk}
                className="mt-7 w-[280px] h-[48px] bg-[#4FA65B] text-white rounded-xl text-[16px] font-medium cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Walk_existing;

// ---------------- utils ----------------

function safeJsonParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}

// ✅ 코스 좌표 안전 추출
function extractCoursePath(course: any): Array<[number, number]> {
  if (!course) return [];
  const c = course?.data ?? course;

  const candidates =
    c?.coursePath ||
    c?.pathCoordinates ||
    c?.path_points ||
    c?.path ||
    c?.coordinates ||
    c?.course?.coursePath ||
    c?.course?.pathCoordinates ||
    c?.course?.coordinates;

  if (Array.isArray(candidates) && candidates.length > 0) {
    const norm = candidates
      .map((p: any) => {
        if (Array.isArray(p) && p.length >= 2) return [Number(p[0]), Number(p[1])] as [number, number];
        if (p && typeof p === 'object') {
          const lat = p.lat ?? p.latitude;
          const lng = p.lng ?? p.longitude;
          if (lat != null && lng != null) return [Number(lat), Number(lng)] as [number, number];
        }
        return null;
      })
      .filter(Boolean) as Array<[number, number]>;
    if (norm.length > 0) return norm;
  }

  const geo = c?.geojson ?? c?.geometry ?? c?.course?.geometry;
  if (geo?.type === 'LineString' && Array.isArray(geo.coordinates)) {
    const norm = geo.coordinates
      .map((xy: any) =>
        Array.isArray(xy) && xy.length >= 2 ? [Number(xy[1]), Number(xy[0])] as [number, number] : null
      )
      .filter(Boolean) as Array<[number, number]>;
    if (norm.length > 0) return norm;
  }

  return [];
}

// ✅ 간단한 거리(m) 계산 (Haversine)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
