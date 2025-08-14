import { useRef, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { currentLocationState } from '../hooks/walkAtoms';
import { getCourseRecommendations } from '../services/courses';
import { getMyWalkRecords } from '../services/users';
import StartWalkButton from './StartWalkButton';
import MyLocationButton from './MyLocationButton';
import type { KakaoMapHandle } from './KakaoMap';
import Profile from '../hooks/Profile';

type Props = {
  /** 부모(맵을 렌더하는 곳)에서 내려주는 kakaoMap ref */
  mapRef: React.RefObject<KakaoMapHandle>;
};

export default function BottomSheet({ mapRef }: Props) {
  // ---- 사이즈 & 드래그 상태 ----
  const [vh, setVh] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const SNAP = useMemo(() => {
    const FULL = Math.round(vh * 0.9);
    const PEEK = 30;
    const MID = Math.round((FULL + PEEK) / 2); // ← 중앙(50%)
    return { FULL, MID, PEEK };
  }, [vh]);

  const [heightPx, setHeightPx] = useState<number>(200);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const startHeight = useRef<number>(200);
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // easeOut-ish
  const DURATION = 240;

  const isExpanded = heightPx > SNAP.MID;

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- 데이터 로딩 ----
  const navigate = useNavigate();
  const name = useRecoilValue(nameState);
  const currentLocation = useRecoilValue(currentLocationState);

  const [courses, setCourses] = useState<any[]>([]);
  const [walkRecords, setWalkRecords] = useState<any[]>([]);

  useEffect(() => {
    let isLoading = false;
    const loadData = async () => {
      if (isLoading) return;
      isLoading = true;
      try {
        const lat = currentLocation?.lat ?? 37.5665;
        const lng = currentLocation?.lng ?? 126.9780;
        const res = await getCourseRecommendations({
          latitude: lat,
          longitude: lng,
          radius: 2000,
          sortBy: 'tailcopterScoreDesc',
          page: 1,
          size: 10,
        });
        const data = res?.data ?? res;
        setCourses(data?.data?.courses || data?.data || data?.courses || []);
      } catch {
        setCourses([]);
      }
      try {
        const res = await getMyWalkRecords({ page: 1, size: 5, sortBy: 'created_at' });
        const data = res?.data ?? res;
        setWalkRecords(data?.walkRecords || []);
      } catch {
        setWalkRecords([]);
      }
      isLoading = false;
    };
    loadData();
    return () => {
      isLoading = false;
    };
  }, [currentLocation]);

  // ---- 드래그 ----
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const snapPoints = useMemo(() => [SNAP.PEEK, SNAP.MID, SNAP.FULL], [SNAP]);

  const snapToNearest = (v: number) => {
    let best = snapPoints[0];
    let bestDiff = Math.abs(v - best);
    for (const p of snapPoints) {
      const d = Math.abs(v - p);
      if (d < bestDiff) {
        best = p;
        bestDiff = d;
      }
    }
    return best;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startHeight.current = heightPx;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    if (e.cancelable) e.preventDefault();
    const delta = e.touches[0].clientY - startY.current;
    const h = clamp(startHeight.current - delta, SNAP.PEEK, SNAP.FULL);
    setHeightPx(h);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    setHeightPx((h) => snapToNearest(clamp(h, SNAP.PEEK, SNAP.FULL)));
    startY.current = null;
  };

  const handleMouseUp = () => {
    setDragging(false);
    setHeightPx((h) => snapToNearest(clamp(h, SNAP.PEEK, SNAP.FULL)));
    startY.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startY.current = e.clientY;
    startHeight.current = heightPx;
    setDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (startY.current == null) return;
    const delta = e.clientY - startY.current;
    const h = clamp(startHeight.current - delta, SNAP.PEEK, SNAP.FULL);
    setHeightPx(h);
  };

  // threshold를 정해요. 중간 스냅 이상일 때 z-0로 내리려면:
  const Z_THRESHOLD = SNAP.FULL; // 필요시 + 오프셋 가능
  const sheetZ = heightPx >= Z_THRESHOLD ? 'z-0' : 'z-50';

  // ▶ 버튼 숨김/비활성화를 위한 상태 (임계 이상일 때)
  const isRaised = heightPx >= Z_THRESHOLD;

  // ---- 포맷터 ----
  const formatDistance = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`;
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  };
  const formatDate = (d: string) => {
    const date = new Date(d);
    const y = String(date.getFullYear()).slice(2);
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${y}.${mo}.${da}`;
  };

  // 지도 이동 버튼 액션
  const handleMoveToMyLocation = () => {
    mapRef?.current?.moveToMyLocation?.();
  };

  return (
    <>
      {/* ▶▶ 같은 행: 시작/내위치 버튼 */}
      <div
        className={`fixed inset-x-0 flex justify-center pointer-events-none transition-opacity duration-200 ${isRaised ? 'opacity-0' : 'opacity-100'} z-[60]`}
        style={{
          bottom: `${heightPx + 16}px`,
          transition: dragging ? 'none' : `bottom ${DURATION}ms ${EASE}, opacity ${DURATION}ms ${EASE}`,
        }}
      >
        <div className={`flex items-center gap-2 ${isRaised ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          <StartWalkButton />
          <MyLocationButton onClick={handleMoveToMyLocation} />
        </div>
      </div>

      {/* 바텀 시트 */}
      <div
        className={`fixed bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-lg ${sheetZ}`}
        style={{
          height: heightPx,
          transition: dragging ? 'none' : `height ${DURATION}ms ${EASE}, box-shadow ${DURATION}ms ${EASE}`,
          willChange: 'height',
          overscrollBehavior: 'contain',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* 드래그 핸들 */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-5 cursor-grab active:cursor-grabbing" />
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5">
            <h2 className="text-[15px] font-semibold text-gray-800 mb-3 mt-1">
              우리 동네 추천코스
            </h2>

            {/* 추천 코스 섹션 */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Profile basePadding={2} />
                <p className="text-[13px] text-gray-600">
                  <span className="font-medium text-gray-900">{name || '반려견'}</span>를 위한 추천
                </p>
                <span
                  onClick={() => navigate('/recommended_course_list')}
                  className="ml-auto text-[11px] text-gray-400 cursor-pointer">모두보기 ›
                </span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                {courses.length > 0 ? (
                  courses.map((course: any, idx: number) => (
                    <div
                      key={idx}
                      className="min-w-[120px] flex-shrink-0 cursor-pointer"
                      onClick={() => navigate('/course_selected_detail', { state: { course } })}
                    >
                      <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-green-50 w-[40vh] h-[20vh]">
                        {course.coverImageUrl || course.photoUrl || course.coursePhotoUrl ? (
                          <img
                            src={course.coverImageUrl || course.photoUrl || course.coursePhotoUrl}
                            alt={course.courseName || course.name || `코스 ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">🌳</span></div>
                        )}
                        <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5">
                          <span className="text-[8px]">🦴</span>
                          <span className="font-medium">{course.averageTailcopterScore || course.tailcopterScore || '75'}</span>
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <h3 className="text-[12px] font-medium text-gray-800 truncate">
                          {course.courseName || course.name || `코스 ${idx + 1}`}
                        </h3>
                        <p className="text-[10px] text-gray-500">
                          {course.courseLengthMeters
                            ? `${course.courseLengthMeters >= 1000 ? (course.courseLengthMeters / 1000).toFixed(1) + 'km' : course.courseLengthMeters + 'm'}`
                            : (course.distanceText || '2.4km')}
                          {course.estimatedDurationSeconds
                            ? ` · ${Math.round(course.estimatedDurationSeconds / 60)}분`
                            : (course.features?.[0] ? ` · ${course.features[0]}` : '')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full py-4 text-center text-gray-400">
                    <p className="text-xs">추천 코스를 불러오는 중...</p>
                  </div>
                )}
              </div>
            </div>

            {/* 산책일지: 중간 이상에서만 표시 */}
            {isExpanded && (
              <div className="mt-7 pt-4 border-t border-gray-200">
                <h2 className="text-[15px] font-semibold text-gray-800 mt-4 mb-3">산책일지</h2>

                <div className="flex items-center gap-2 mb-3">
                  <Profile basePadding={2}
                  />
                  <p className="text-[13px] text-gray-600">
                    <span className="font-medium text-gray-900">{name || '반려견'}</span>의 산책 일지
                  </p>
                  <span
                    onClick={() => navigate('/walk_records')}
                    className="ml-auto text-[11px] text-gray-400 cursor-pointer">모두보기 ›
                  </span>
                </div>

                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                  {walkRecords.length > 0 ? (
                    walkRecords.map((record: any, idx: number) => (
                      <div
                        key={idx}
                        className="min-w-[120px] flex-shrink-0 cursor-pointer"
                        onClick={() =>
                          navigate(`/walk_records/${record.walk_record_id || record.walkRecordId}`, { state: { record } })
                        }
                      >
                        <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 w-[40vh] h-[20vh]">
                          {record.path_image_url || record.pathImageUrl || record.photoUrl ? (
                            <img
                              src={record.path_image_url || record.pathImageUrl || record.photoUrl}
                              alt={`산책 ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">🌅</span></div>
                          )}
                          <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5">
                            <span className="text-[8px]">🦴</span>
                            <span className="font-medium">{record.tailcopter_score || record.tailcopterScore || '75'}</span>
                          </div>
                        </div>
                        <div className="mt-1.5">
                          <h3 className="text-[12px] font-medium text-gray-800 truncate">
                            {record.course_name || record.courseName || record.title || `우리동네 코스`}
                          </h3>
                          <p className="text-[10px] text-gray-500">
                            {(record.end_time || record.start_time) && formatDate(record.end_time || record.start_time)}
                            {record.distance_meters && ` · ${formatDistance(record.distance_meters)}`}
                            {record.duration_seconds && ` · ${formatTime(record.duration_seconds)}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full text-center py-4 text-gray-400">
                      <p className="text-xs">아직 산책 기록이 없어요</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
