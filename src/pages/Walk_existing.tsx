import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MdWaterDrop } from 'react-icons/md';
import { renderToString } from 'react-dom/server';
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
import { getCourseDetails, getCoursePhotozones } from '../services/courses';
import CourseRecord from './CourseRecord';

const RECORD_AFTER_PATH = '/walk_record_after_walk';

const Walk_existing = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;

  // ---- 거리/경로/식별자 Recoil ----
  const [distance, setDistance] = useRecoilState(walkDistanceMetersState);
  const [walkRecordId] = useRecoilState(walkRecordIdState);
  const [startedAt, setStartedAt] = useRecoilState(walkStartedAtState);
  const [, setMarkingCount] = useRecoilState(walkMarkingCountState);
  const [, setPathCoordinates] = useRecoilState(walkPathCoordinatesState);
  const pathCoordinatesValue = useRecoilValue(walkPathCoordinatesState);
  const setMapCaptureImage = useSetRecoilState(mapCaptureImageState);

  // ---- 기타 상태 ----
  const [markRequested, setMarkRequested] = useState(false);
  const mapRef = useRef<any>(null);
  const pathRef = useRef<number[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cheatActivatedRef = useRef(false);

  // ---- 위치/테스트 모드 ----
  const currentLocation = useRecoilValue(currentLocationState);
  const [testMode, setTestMode] = useState(false); // 유지 (버튼 동작과 무관)
  const [virtualPosition, setVirtualPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // 출발 기준(앵커)
  const firstTrackRef = useRef<{ lat: number; lng: number } | null>(null);
  const initialFixRef = useRef<{ lat: number; lng: number } | null>(
    currentLocation ?? null
  );
  useEffect(() => {
    if (currentLocation && !initialFixRef.current) {
      initialFixRef.current = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      };
    }
  }, [currentLocation]);

  // ---- 코스 정보 ----
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [coursePhotozones, setCoursePhotozones] = useState<any[]>([]);
  const pinOverlaysRef = useRef<any[]>([]);

  const incomingCourse =
    location?.state?.course ?? location?.state?.selectedCourse ?? null;

  const incomingCourseId =
    location?.state?.courseId ??
    incomingCourse?.course_id ??
    incomingCourse?.id ??
    incomingCourse?.courseId ??
    null;

  const ssCourseRaw =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('selected_course')
      : null;
  const ssCourseIdRaw =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('selected_course_id')
      : null;
  const ssCourse = ssCourseRaw ? safeJsonParse(ssCourseRaw) : null;
  const ssCourseId =
    ssCourseIdRaw ??
    (ssCourse?.course_id || ssCourse?.id || ssCourse?.courseId);

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
          const coursePayload = data?.data ?? data ?? null;
          setSelectedCourse(coursePayload);
          console.info('[Walk_existing] course details loaded', {
            courseId: idToFetch,
            keys: Object.keys((data?.data ?? data) || {}),
            sample:
              (data?.data ?? data)?.pathCoordinates ||
              (data?.data ?? data)?.path ||
              (data?.data ?? data)?.geometry,
          });
          // 코스 상세 내 포함된 포토존 우선 적용
          const pzRaw = coursePayload?.markingPhotozones;
          console.info('[Walk_existing] markingPhotozones raw', {
            type: typeof pzRaw,
            isArray: Array.isArray(pzRaw),
            keys:
              pzRaw && !Array.isArray(pzRaw) && typeof pzRaw === 'object'
                ? Object.keys(pzRaw)
                : undefined,
          });
          let pzInDetails: any[] | null = null;
          if (Array.isArray(pzRaw)) pzInDetails = pzRaw;
          else if (pzRaw && typeof pzRaw === 'object') {
            pzInDetails = (pzRaw.photozones ||
              pzRaw.items ||
              pzRaw.data ||
              pzRaw.results ||
              null) as any[] | null;
          }
          if (Array.isArray(pzInDetails) && pzInDetails.length > 0) {
            setCoursePhotozones(pzInDetails);
            console.info('[Walk_existing] photozones from details', {
              count: pzInDetails.length,
              sample: pzInDetails[0],
            });
          }
          // 코스 포토존도 병렬로 불러오기
          try {
            const pzRes = await getCoursePhotozones(idToFetch);
            const pzData = (pzRes as any)?.data ?? pzRes;
            const list =
              pzData?.data?.photozones ||
              pzData?.photozones ||
              pzData?.data ||
              [];
            if (active && Array.isArray(list) && list.length > 0) {
              setCoursePhotozones(list);
            }
            console.info('[Walk_existing] photozones loaded', {
              count: Array.isArray(list) ? list.length : 0,
              sample: Array.isArray(list) && list.length ? list[0] : null,
            });
          } catch {}
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
    // 이미 세션에 경로가 남아있거나, 임시 플래그가 있으면 초기화 스킵
    const suspend = (() => {
      try {
        const v = sessionStorage.getItem('suspend_walk_reset');
        if (v === '1') sessionStorage.removeItem('suspend_walk_reset');
        return v === '1';
      } catch {
        return false;
      }
    })();

    if (pathCoordinatesValue.length > 0 || suspend) {
      if (!startedAt) setStartedAt(Date.now());
      return;
    }

    setDistance(0);
    setPathCoordinates([]);
    setMarkingCount(0);
    pathRef.current = [];
    firstTrackRef.current = null;
    finishShownRef.current = false;
    if (!startedAt) setStartedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkRecordId]);

  // 코스 포토존 핀 렌더링
  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map || !window.kakao || !Array.isArray(coursePhotozones))
      return () => {};

    // 기존 핀 제거
    pinOverlaysRef.current.forEach((ov) => ov?.setMap?.(null));
    pinOverlaysRef.current = [];

    console.info('[Walk_existing] rendering pins', {
      count: coursePhotozones.length,
    });

    coursePhotozones.forEach((pz: any) => {
      const lat = Number(pz.latitude ?? pz.lat ?? pz.y ?? pz[1]);
      const lng = Number(pz.longitude ?? pz.lng ?? pz.x ?? pz[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      console.debug('[Walk_existing] pin', {
        lat,
        lng,
        id: pz.photozone_id || pz.id,
      });
      // KakaoMap.tsx의 마킹 마커 UI와 동일한 구조/스타일 재사용
      const iconHTML = renderToString(
        <MdWaterDrop
          style={{ width: '20px', height: '20px', color: '#4FA65B' }}
        />
      );
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <div style="
          background-color: #FFD86A;
          border-radius: 12px;
          padding: 4px;
          position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          ${iconHTML}
          <div style="
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 10px solid #FFD86A;
          "></div>
        </div>
      `;
      const markerEl = wrapper.firstElementChild as HTMLElement;
      markerEl.title = '포토존 보기';
      markerEl.onclick = () => {
        try {
          sessionStorage.setItem('suspend_walk_reset', '1');
        } catch {}
        const courseIdForNav =
          incomingCourseId ||
          ssCourseId ||
          selectedCourse?.id ||
          selectedCourse?.course_id ||
          null;
        const photozoneId =
          pz.photozone_id || pz.id || String(lat) + ',' + String(lng);
        console.info('[Walk_existing] pin clicked → navigate', {
          courseIdForNav,
          photozoneId,
        });
        navigate('/marking_photozone', {
          state: { courseId: courseIdForNav, photozoneId },
        });
      };

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(lat, lng),
        content: markerEl,
        yAnchor: 1,
        zIndex: 6,
      });
      overlay.setMap(map);
      pinOverlaysRef.current.push(overlay);
    });

    return () => {
      pinOverlaysRef.current.forEach((ov) => ov?.setMap?.(null));
      pinOverlaysRef.current = [];
    };
  }, [
    coursePhotozones,
    navigate,
    incomingCourseId,
    ssCourseId,
    selectedCourse,
  ]);

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
    () =>
      totalDistanceMeters > 0
        ? totalDistanceMeters * 0.5
        : Number.POSITIVE_INFINITY,
    [totalDistanceMeters]
  );

  // ✅ 전체 코스 경로(회색) 프리셋
  const basePath = useMemo(
    () => extractCoursePath(selectedCourse),
    [selectedCourse]
  );

  // ✅ basePathOptions는 useMemo로 (불필요 렌더 방지용, KakaoMap도 안전하게 처리함)
  const basePathOptions = useMemo(
    () => ({
      strokeColor: '#CCCCCC',
      strokeWeight: 5,
      strokeOpacity: 1,
      strokeStyle: 'solid' as const,
    }),
    []
  );

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
      if (!firstTrackRef.current)
        firstTrackRef.current = { lat: c.lat, lng: c.lng };
      pathRef.current.push([c.lat, c.lng]);
      setPathCoordinates((prev) => [...prev, [c.lat, c.lng]]);
    },
    [setPathCoordinates]
  );

  // 기준 위치 가져오기
  const getBasePosition = useCallback((): { lat: number; lng: number } => {
    const fallback = currentLocation ?? { lat: 37.545354, lng: 126.952576 };
    const fromMap = mapRef.current?.getCurrentPosition?.();
    const base = virtualPosition ?? fromMap ?? fallback;
    if (!base || base.lat == null || base.lng == null) return fallback;
    return base;
  }, [virtualPosition, currentLocation]);

  // 위/경도 50m 이동 유틸
  const moveByMeters = useCallback(
    (northMeters: number, eastMeters: number) => {
      // 치팅 시작: 첫 버튼 입력 순간부터 GPS 추적 차단(testMode on)
      if (!cheatActivatedRef.current) {
        cheatActivatedRef.current = true;
        setTestMode(true);
        const current = mapRef.current?.getCurrentPosition?.() ||
          currentLocation || { lat: 37.545354, lng: 126.952576 };
        if (current && current.lat != null && current.lng != null) {
          setVirtualPosition({ lat: current.lat, lng: current.lng });
        }
      }

      const base = getBasePosition();
      const latRad = (base.lat * Math.PI) / 180;
      const dLat = northMeters / 111_000;
      const denom = Math.max(Math.cos(latRad) * 111_000, 1e-6);
      const dLng = eastMeters / denom;

      const newLat = base.lat + dLat;
      const newLng = base.lng + dLng;

      setVirtualPosition({ lat: newLat, lng: newLng });

      if (mapRef.current?.updatePosition) {
        mapRef.current.updatePosition(newLat, newLng);
      }
      handlePathUpdate({ lat: newLat, lng: newLng });
    },
    [getBasePosition, handlePathUpdate]
  );

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
      const durationSec = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;
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
        // ✅ 전체 코스(회색) 프리셋 경로 + 옵션
        basePath={basePath}
        basePathOptions={basePathOptions}
        // ✅ 기존 코스 경로는 회색 유지, 실시간 초록은 따로: 필요 시 켬/끔 가능
        drawRealtimePolyline={true}
      >
        {(courseName || totalDistanceMeters > 0) && (
          <CourseRecord
            distance={distance}
            courseName={courseName}
            totalDistanceMeters={totalDistanceMeters}
          />
        )}

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
            confirmOnPause={true}
            endModal={{
              message: '산책을 종료할까요?',
              subMessage:
                '코스를 끝까지 마치지 않으면\n꼬리콥터를 흔들 수 없어요.',
              confirmText: '계속하기',
              cancelText: '종료하기',
            }}
            // ✅ 이 페이지에서만 동작 오버라이드
            onEndConfirmOverride={handleEndKeepWalking}
            onEndCancelOverride={handleEndToRecordAfter}
          />
        </div>
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
              console.info('[Walk_existing] marking created', {
                walkRecordId,
                lat,
                lng,
                fileUrl,
                resp: savedRes,
              });
              setMarkingCount((c) => c + 1);

              const previewUrl = URL.createObjectURL(file);
              const saved = (savedRes as any)?.data ?? savedRes;
              const markingPhotoId =
                saved?.id ||
                saved?.markingPhotoId ||
                saved?.data?.id ||
                undefined;

              const payload = {
                fileUrl,
                previewUrl,
                lat,
                lng,
                ts: Date.now(),
                markingPhotoId,
              };
              sessionStorage.setItem(
                'last_marking_photo',
                JSON.stringify(payload)
              );

              // 업로드 성공 후에는 라우팅하지 않음. 산책 흐름 유지
              // 로컬스토리지에 마킹/포토존 정보를 쓰지 않음

              // ✅ 핀 즉시 반영: 서버 재조회 후, 실패 시 로컬 추가(fallback)
              try {
                const courseIdForNav =
                  incomingCourseId ||
                  ssCourseId ||
                  (selectedCourse as any)?.id ||
                  (selectedCourse as any)?.course_id ||
                  (selectedCourse as any)?.courseId ||
                  null;

                const photozoneId =
                  saved?.data?.photozoneId ||
                  saved?.data?.photozone_id ||
                  saved?.photozoneId ||
                  saved?.photozone_id ||
                  null;

                if (courseIdForNav) {
                  try {
                    const pzRes2 = await getCoursePhotozones(courseIdForNav);
                    const pzData2: any = (pzRes2 as any)?.data ?? pzRes2;
                    const list2 =
                      pzData2?.data?.photozones ||
                      pzData2?.photozones ||
                      pzData2?.data ||
                      [];
                    if (Array.isArray(list2)) {
                      if (
                        photozoneId &&
                        !list2.some(
                          (p: any) => (p.photozone_id || p.id) === photozoneId
                        )
                      ) {
                        list2.push({
                          photozone_id: photozoneId,
                          latitude: lat,
                          longitude: lng,
                        });
                      }
                      setCoursePhotozones(list2);
                    }
                  } catch (e) {
                    if (photozoneId) {
                      setCoursePhotozones((prev: any[]) => {
                        if (
                          prev.some(
                            (p) => (p.photozone_id || p.id) === photozoneId
                          )
                        )
                          return prev;
                        return [
                          ...prev,
                          {
                            photozone_id: photozoneId,
                            latitude: lat,
                            longitude: lng,
                          },
                        ];
                      });
                    }
                  }
                } else if (photozoneId) {
                  setCoursePhotozones((prev: any[]) => {
                    if (
                      prev.some((p) => (p.photozone_id || p.id) === photozoneId)
                    )
                      return prev;
                    return [
                      ...prev,
                      {
                        photozone_id: photozoneId,
                        latitude: lat,
                        longitude: lng,
                      },
                    ];
                  });
                }
              } catch {}
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
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
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
        if (Array.isArray(p) && p.length >= 2)
          return [Number(p[0]), Number(p[1])] as [number, number];
        if (p && typeof p === 'object') {
          const lat = p.lat ?? p.latitude;
          const lng = p.lng ?? p.longitude;
          if (lat != null && lng != null)
            return [Number(lat), Number(lng)] as [number, number];
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
        Array.isArray(xy) && xy.length >= 2
          ? ([Number(xy[1]), Number(xy[0])] as [number, number])
          : null
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
  return 2 * R * Math.atan2(Math.sqrt(1 - a), 1 - Math.sqrt(1 - a)); // 동일 결과
}
