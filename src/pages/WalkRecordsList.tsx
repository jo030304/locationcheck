import { useEffect, useState } from 'react';
import { getMyWalkRecords } from '../services/users';
import { useNavigate } from 'react-router-dom';

type WalkRecord = {
  walk_record_id?: string;
  created_at?: string;
  duration?: number;
  distance?: number;
  title?: string;
};

export default function WalkRecordsList() {
  const [records, setRecords] = useState<WalkRecord[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyWalkRecords({
          page: 1,
          size: 20,
          sortBy: 'created_at',
        });
        const data = (res as any)?.data ?? res;
        const list = data?.data?.records || data?.records || [];
        setRecords(list);
      } catch (e) {
        setRecords([]);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5">
      <h1 className="text-xl font-semibold mb-4">산책일지 목록</h1>
      <div className="space-y-3">
        {records.map((r, idx) => {
          const id = (r as any).walk_record_id || (r as any).id || `${idx}`;
          const created = r.created_at
            ? new Date(r.created_at).toLocaleString()
            : '';
          const title = (r as any).title || `산책 #${idx + 1}`;
          const distanceKm =
            r.distance != null
              ? (r.distance as any)
              : (r as any).distanceMeters;
          const distanceText =
            distanceKm != null
              ? `${(Number(distanceKm) / 1000).toFixed(2)}km`
              : '';
          const durationSec =
            r.duration != null ? r.duration : (r as any).durationSeconds;
          const durationText =
            durationSec != null
              ? `${Math.round(Number(durationSec) / 60)}분`
              : '';
          return (
            <button
              key={id}
              className="w-full text-left border rounded-xl p-3 bg-white cursor-pointer"
              onClick={() => navigate(`/walk_records/${id}`, { state: { record: r } })}
            >
              <div className="font-medium">{title}</div>
              <div className="text-sm text-gray-500">{created}</div>
              <div className="text-sm text-gray-700">
                {[distanceText, durationText].filter(Boolean).join(' · ')}
              </div>
            </button>
          );
        })}
        {records.length === 0 && (
          <div className="text-sm text-gray-500">기록이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
