import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { useRecoilValue } from 'recoil';
import { currentLocationState } from '../hooks/walkAtoms';
import { nameState } from '../hooks/animalInfoAtoms'; // ✅ 추가
import { getCourseRecommendations } from '../services/courses';

type Course = {
  id?: string | number;
  name?: string;
  courseName?: string;
  coverImageUrl?: string;
  photoUrl?: string;
  coursePhotoUrl?: string;
  averageTailcopterScore?: number;
  tailcopterScore?: number;
  courseLengthMeters?: number;
  distanceText?: string;
  estimatedDurationSeconds?: number;
  features?: string[];
  tags?: string[];
};

const getTailScore = (c: any): number | undefined => {
  const raw =
    c?.averageTailcopterScore ??
    c?.tailcopterScore ??
    c?.average_tailcopter_score ??
    c?.tailcopter_score ??
    c?.tailCopterScore ??
    c?.score ??
    c?.meta?.tailcopterScore;

  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : undefined;
};

export default function Recommended_course_list() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { courses?: Course[] } };
  const currentLocation = useRecoilValue(currentLocationState);
  const dogName = (useRecoilValue(nameState) || '').trim(); // ✅ 추가

  const [items, setItems] = useState<Course[]>(location.state?.courses ?? []);
  const [loading, setLoading] = useState<boolean>(!location.state?.courses);

  useEffect(() => {
    if (location.state?.courses) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const lat = currentLocation?.lat ?? 37.5665;
        const lng = currentLocation?.lng ?? 126.9780;

        const res = await getCourseRecommendations({
          latitude: lat,
          longitude: lng,
          radius: 2000,
          sortBy: 'tailcopterScoreDesc',
          page: 1,
          size: 20,
        });
        const data: any = res?.data ?? res;
        const list = data?.data?.courses || data?.data || data?.courses || [];
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const formatDistance = (m?: number) =>
    typeof m === 'number' ? (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`) : '';

  const formatMinutes = (s?: number) =>
    typeof s === 'number' ? `${Math.round(s / 60)}분` : '';

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5 relative">
      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          className="text-gray-600 cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          <span className="text-[#4FA65B]">{dogName || '반려견'}</span>의 산책일지
        </h1>
      </div>

      {/* 리스트 */}
      <main className="px-4">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">추천 코스를 불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">표시할 추천 코스가 없어요</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {items.map((course, i) => {
              const title = course.courseName || course.name || `코스 ${i + 1}`;
              const score = getTailScore(course);
              const img = course.coverImageUrl || course.photoUrl || course.coursePhotoUrl;

              const distance =
                typeof course.courseLengthMeters === 'number'
                  ? formatDistance(course.courseLengthMeters)
                  : (course.distanceText || '');

              const duration =
                typeof course.estimatedDurationSeconds === 'number'
                  ? formatMinutes(course.estimatedDurationSeconds)
                  : '';

              const meta = [distance, duration].filter(Boolean).join(' · ');

              const tagsArr = (course.features || course.tags || []).slice(0, 3);
              const tags = tagsArr.map((t) => (t?.startsWith('#') ? t : `#${t}`));

              return (
                <li key={(course.id as any) ?? i}>
                  <button
                    className="w-full py-4 flex items-center gap-3 text-left active:opacity-80 cursor-pointer"
                    onClick={() => navigate('/course_selected_detail', { state: { course } })}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-neutral-900 truncate">
                          {title}
                        </h3>
                        {score !== undefined && (
                          <span className="ml-1 text-[11px] text-neutral-400">
                            🦴 {score}
                          </span>
                        )}
                      </div>

                      {meta && (
                        <p className="mt-1 text-[12px] text-neutral-500 truncate">
                          {meta}
                        </p>
                      )}

                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.map((t, idx) => (
                            <span key={idx} className="text-[11px] text-neutral-400">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 오른쪽 썸네일 */}
                    <div className="w-[64px] h-[64px] flex-shrink-0 rounded-md overflow-hidden bg-gradient-to-br from-amber-200 to-amber-100">
                      {img && (
                        <img
                          src={img}
                          alt={title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
