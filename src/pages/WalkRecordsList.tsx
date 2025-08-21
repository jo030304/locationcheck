import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { useRecoilValue } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { getMyWalkRecords } from '../services/users';

export default function WalkRecordsList() {
  const navigate = useNavigate();
  const dogName = (useRecoilValue(nameState) || '').trim();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getMyWalkRecords({
          page: 1,
          size: 50,
          sortBy: 'created_at',
        });
        const data: any = res?.data ?? res;
        const list =
          data?.walkRecords || data?.data?.walkRecords || data?.data || [];
        if (!cancelled) setRecords(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (d?: string) => {
    if (!d) return '';
    const date = new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  };

  const formatDistance = (m?: number) =>
    typeof m === 'number'
      ? m >= 1000
        ? `${(m / 1000).toFixed(1)}km`
        : `${m}m`
      : '';

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5 relative">
      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          className="text-gray-600 cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          <span className="text-[#4FA65B]">{dogName || '반려견'}</span>의
          산책일지
        </h1>
      </div>

      {/* 리스트 */}
      <main className="px-4">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            불러오는 중…
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            아직 산책 기록이 없어요
          </div>
        ) : (
          <ul className="space-y-6">
            {records.map((rec: any, idx: number) => {
              const title =
                rec.title ||
                rec.course_name ||
                rec.courseName ||
                `산책 ${idx + 1}`;
              const image =
                rec.path_image_url || rec.pathImageUrl || rec.photoUrl || null;
              const createdAt =
                rec.end_time ||
                rec.start_time ||
                rec.created_at ||
                rec.createdAt;
              const distance = rec.distance_meters ?? rec.distanceMeters;

              return (
                <li
                  key={rec.walk_record_id || rec.id || idx}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate(`/walk_records/${rec.walk_record_id || rec.id}`, {
                      state: { record: rec },
                    })
                  }
                >
                  <div className="w-full rounded-2xl overflow-hidden bg-white border border-gray-200 p-3">
                    {/* 이미지: 원본 비율로 표시 */}
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-auto object-contain"
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full min-h-[24vh] grid place-items-center text-gray-400">
                        이미지 없음
                      </div>
                    )}

                    {/* 메타 */}
                    <div className="mt-3">
                      <h3 className="text-[15px] font-semibold text-neutral-900">
                        {title}
                      </h3>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        {formatDate(createdAt)}
                        {distance != null &&
                          ` · ${formatDistance(Number(distance))}`}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
