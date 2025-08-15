// WalkRecordDetails.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { startWalk, getWalkDiaryDetails } from '../services/walks';
import { walkRecordIdState, walkStartedAtState } from '../hooks/walkAtoms';
import Profile from '../hooks/Profile';
import Dimmer from '../hooks/Dimmer';

/* ----------------------------- Confirm Modal ----------------------------- */
type ConfirmModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

function ConfirmModal({
  open,
  title,
  subtitle,
  confirmText = '예',
  cancelText = '아니요',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <Dimmer opacity={0.4} z={50} onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          className="relative bg-[#FEFFFA] rounded-2xl px-5 py-5 w-[309px] h-[182px] max-w-[90%] shadow-xl flex flex-col justify-between"
        >
          <div className="flex flex-col items-center gap-3 text-center mt-2">
            <p className="text-[18px] font-semibold leading-snug">{title}</p>
            {subtitle && (
              <p className="text-sm text-[#616160] leading-relaxed whitespace-pre-line">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 h-[48px] bg-[#E5E7EB] text-[#616160] rounded-xl text-[16px] font-medium cursor-pointer active:opacity-90"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-[48px] bg-[#4FA65B] text-white rounded-xl text-[16px] font-medium cursor-pointer disabled:opacity-60 active:opacity-90"
            >
              {loading ? '시작 중…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* --------------------------- helpers --------------------------- */
const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

function deepFindCourseId(input: any): number | string | null {
  if (!input) return null;
  const q: any[] = [input];
  const seen = new Set<any>();
  let steps = 0;
  while (q.length && steps < 800) {
    steps++;
    const cur = q.shift();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);

    if ((cur as any).course_id != null) return (cur as any).course_id;
    if ((cur as any).courseId != null)  return (cur as any).courseId;

    if ((cur as any).course && typeof (cur as any).course === 'object') {
      const c = (cur as any).course;
      if (c.course_id != null) return c.course_id;
      if (c.courseId  != null) return c.courseId;
      if (c.id        != null) return c.id;
      if (c.data && typeof c.data === 'object') {
        if (c.data.course_id != null) return c.data.course_id;
        if (c.data.courseId  != null) return c.data.courseId;
        if (c.data.id        != null) return c.data.id;
      }
    }
    for (const k of Object.keys(cur)) {
      const v = (cur as any)[k];
      if (v && typeof v === 'object') q.push(v);
    }
  }
  return null;
}

const toNumIfNumeric = (v: any) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '날짜 정보 없음';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${y}. ${m}. ${day} (${wd})`;
};

const formatDistance = (meters: number) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)}km`;
  return `${meters}m`;
};

// 세션 키
const keyForRecord = (id?: string | number | null) => (id ? `walk_record_course_${id}` : '');

function cacheCourseId(recordId: string | number | null | undefined, courseId: any) {
  const key = keyForRecord(recordId);
  if (!key) return;
  try { sessionStorage.setItem(key, String(courseId)); } catch {}
}

function readCachedCourseId(recordId: string | number | null | undefined): string | number | null {
  const key = keyForRecord(recordId);
  if (!key) return null;
  try {
    const v = sessionStorage.getItem(key);
    return v == null ? null : toNumIfNumeric(v);
  } catch { return null; }
}

/* --------------------------- WalkRecordDetails --------------------------- */
export default function WalkRecordDetails() {
  const { walkRecordId } = useParams();
  const location = useLocation();
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const dogName = useRecoilValue(nameState);

  const setWalkRecordId = useSetRecoilState(walkRecordIdState);
  const setWalkStartedAt = useSetRecoilState(walkStartedAtState);

  // 상세 로드
  useEffect(() => {
    const loadDetails = async () => {
      if (location.state?.record) {
        const d = unwrap(location.state.record);
        setDetails(d);
        // 들어온 state에서라도 코스ID 캐싱
        const cidFromState =
          location.state?.courseId ??
          location.state?.course?.courseId ??
          location.state?.course?.id ??
          location.state?.course?.course_id ??
          null;
        const cid = cidFromState ?? deepFindCourseId(d);
        if (cid != null) cacheCourseId(walkRecordId ?? d?.walk_record_id ?? d?.id, cid);
        return;
      }

      if (!walkRecordId) {
        setDetails({
          walk_record_id: walkRecordId,
          title: '산책 기록',
          path_image_url: null,
          markingPhotos: [],
          distance_meters: 0,
          marking_count: 0,
          tailcopter_score: 0,
          created_at: new Date().toISOString(),
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await getWalkDiaryDetails(walkRecordId);
        const data = unwrap(response);
        setDetails(data);

        // ✅ 응답에서 코스ID 찾아서 캐싱 (다음에 못찾아도 세션에서 꺼내 쓸 수 있게)
        const cid = deepFindCourseId(data);
        if (cid != null) cacheCourseId(walkRecordId, cid);
      } catch (error) {
        console.error('산책 기록 상세 정보 조회 실패:', error);
        setDetails({
          walk_record_id: walkRecordId,
          title: '산책 기록',
          path_image_url: null,
          markingPhotos: [],
          distance_meters: 0,
          marking_count: 0,
          tailcopter_score: 0,
          created_at: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadDetails();
  }, [walkRecordId, location.state]);

  const handleStartButton = () => setConfirmOpen(true);

  const handleConfirmStart = async () => {
    setStarting(true);
    try {
      // 1) 라우트 state
      let courseId: any =
        location.state?.courseId ??
        location.state?.course?.courseId ??
        location.state?.course?.id ??
        location.state?.course?.course_id ??
        null;

      // 2) details 깊은 탐색
      if (courseId == null) courseId = deepFindCourseId(details);

      // 3) 세션 캐시 (이 기록으로 들어온 적 있다면 저장돼 있음)
      if (courseId == null) courseId = readCachedCourseId(walkRecordId ?? details?.walk_record_id ?? details?.id);

      // 4) 마지막 안전장치: 이전 화면에서 저장했을 수도 있는 전역 선택 코스
      if (courseId == null) {
        try {
          const ss = sessionStorage.getItem('selected_course_id');
          if (ss) courseId = toNumIfNumeric(ss);
        } catch {}
      }

      if (courseId == null) {
        console.warn('[WalkRecordDetails] courseId not found', { details, state: location.state });
        alert('이 기록에 연결된 코스 정보를 찾지 못했어요.');
        setConfirmOpen(false);
        return;
      }

      // 숫자 문자열이면 숫자로
      courseId = toNumIfNumeric(courseId);

      const res = await startWalk({
        walk_type: 'EXISTING_COURSE',
        course_id: courseId,
      });
      const data = unwrap(res);

      const newWalkRecordId =
        data?.data?.walk_record_id ??
        data?.walk_record_id ??
        data?.walkRecordId ??
        null;

      setWalkRecordId(newWalkRecordId || null);
      setWalkStartedAt(Date.now());

      // 다음 화면에서도 courseId 필요하면 state + 세션에 남김
      try { sessionStorage.setItem('selected_course_id', String(courseId)); } catch {}

      setConfirmOpen(false);
      navigate('/walk_countdown?state=existing', {
        state: { startType: 'existing', from: 'exist', courseId, walkRecordId: newWalkRecordId },
      });
    } catch (e) {
      console.error('startWalk failed', e);
      alert('산책을 시작할 수 없습니다.');
    } finally {
      setStarting(false);
    }
  };

  if (isLoading || !details) {
    return (
      <div className="w-full h-screen max-w-sm mx-auto bg-[#FEFFFA] rounded-xl shadow-lg px-6 py-8 relative">
        <div className="w-full h-full grid place-items-center text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen max-w-sm mx-auto bg-[#FEFFFA] rounded-xl shadow-lg px-6 py-8 relative">
      {/* 닫기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 text-gray-400 text-xl font-bold cursor-pointer z-10"
        aria-label="닫기"
        title="닫기"
      >
        ×
      </button>

      {/* 날짜 */}
      <p className="text-[22px] font-semibold mb-4">
        {details.created_at ? formatDate(details.created_at) : '날짜 정보 없음'}
      </p>

      {/* 코스 제목 + 프로필 이미지 */}
      <div className="flex items-center gap-2 mt-6 mb-6">
        <Profile scale={1.4} basePadding={2.5} />
        <p className="text-[17px] font-semibold">
          <span className="text-[#4FA65B]">{dogName || '반려견'}</span>
          와 함께한 {details.course_name || details.courseName || '코스'}
        </p>
      </div>

      {/* 거리 / 마킹 / 점수 */}
      <div className="flex justify-around items-center text-center text-[14px] gap-6 mt-10 mb-10">
        <div>
          <p className="text-[#616160] mb-2">산책 거리</p>
          <p className="font-semibold text-[16px]">
            {details.distance_meters
              ? formatDistance(details.distance_meters)
              : details.distanceMeters
              ? formatDistance(details.distanceMeters)
              : '0m'}
          </p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">마킹 횟수</p>
          <p className="font-semibold text-[16px]">
            {(details.marking_count ?? details.markingCount ?? 0)}회
          </p>
        </div>
        <div>
          <p className="text-[#616160] mb-2">꼬리 점수</p>
          <p className="font-semibold text-[16px]">
            {Math.round(details.tailcopter_score ?? details.tailcopterScore ?? 0)}점
          </p>
        </div>
      </div>

      {/* 지도 이미지 표시 */}
      <div className="mt-6">
        <div className="w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-[3/2]">
          {details.path_image_url || details.pathImageUrl ? (
            <img
              src={details.path_image_url || details.pathImageUrl}
              alt="산책 경로"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-center">
              <div>
                <div className="text-4xl mb-2">🗺️</div>
                <div className="text-sm text-gray-500">경로 이미지 없음</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 다시 산책하기 버튼 (하단 고정 영역) */}
      <div className="absolute bottom-0 left-0 w-full px-6 pb-6 bg-white">
        <button
          className="w-full py-3 rounded-xl text-[16px] font-semibold bg-[#4FA65B] text-white cursor-pointer active:opacity-90"
          onClick={() => setConfirmOpen(true)}
        >
          이 코스로 다시 산책하기
        </button>
      </div>

      {/* 모달 */}
      <ConfirmModal
        open={confirmOpen}
        title="기억에 남았던 산책멍소"
        subtitle="이 코스로 다시 산책할까요?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmStart}
        loading={starting}
      />
    </div>
  );
}
