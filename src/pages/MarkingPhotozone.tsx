// MarkingPhotozone.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronLeft } from 'react-icons/fa';
import { useRecoilValue } from 'recoil';
import { nameState, breedState, birthState } from '../hooks/animalInfoAtoms';
import { getMyProfile } from '../services/users';
import Avatar from '../hooks/Avatar';

type PhotoState = {
  fileUrl?: string;
  previewUrl?: string;
  lat?: number;
  lng?: number;
  ts?: number | string;
  markingPhotoId?: string;
};

const formatTime = (ts?: number | string) => {
  if (ts == null || ts === '') return '';
  const n = typeof ts === 'string' ? Number(ts) : ts;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return '';
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${hh}:${mm}`;
};

// YYMMDD / YYYYMMDD / YYYY-MM-DD → "n살" 또는 "n개월"
const ageLabelFromBirth = (birth?: string | null): string => {
  if (!birth) return '';
  const digits = (birth || '').replace(/\D/g, '');
  let y: number, m: number, d: number;
  if (digits.length === 6) {
    y = 2000 + parseInt(digits.slice(0, 2), 10);
    m = parseInt(digits.slice(2, 4), 10);
    d = parseInt(digits.slice(4, 6), 10);
  } else if (digits.length === 8) {
    y = parseInt(digits.slice(0, 4), 10);
    m = parseInt(digits.slice(4, 6), 10);
    d = parseInt(digits.slice(6, 8), 10);
  } else {
    return '';
  }
  const now = new Date();
  const b = new Date(y, (m || 1) - 1, d || 1);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 12) return `${months}개월`;
  return `${Math.floor(months / 12)}살`;
};

const MarkingPhotozone = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: PhotoState };

  // Recoil에서 기본 메타
  const recoilName = useRecoilValue(nameState);
  const recoilBreed = useRecoilValue(breedState);
  const recoilBirth = useRecoilValue(birthState);

  const [meta, setMeta] = useState({
    name: '',
    breed: '',
    ageLabel: '',
  });

  const [latest, setLatest] = useState<PhotoState | null>(null);
  const [history, setHistory] = useState<PhotoState[]>([]);

  // 최신(방금 찍은) 사진 복구
  useEffect(() => {
    const fromState = state && (state.previewUrl || state.fileUrl) ? state : null;
    if (fromState) {
      setLatest(fromState);
      sessionStorage.setItem('last_marking_photo', JSON.stringify(fromState));
    } else {
      const raw = sessionStorage.getItem('last_marking_photo');
      if (raw) {
        try { setLatest(JSON.parse(raw)); } catch { }
      }
    }
    return () => {
      if (fromState?.previewUrl) URL.revokeObjectURL(fromState.previewUrl);
    };
  }, [state]);

  // 내 정보 메타 채우기 (Recoil → 부족하면 서버)
  useEffect(() => {
    const first = {
      name: recoilName || '',
      breed: recoilBreed || '',
      ageLabel: ageLabelFromBirth(recoilBirth),
    };
    setMeta((prev) => ({ ...prev, ...first }));
    if (!first.name || !first.breed || !first.ageLabel) {
      (async () => {
        try {
          const res = await getMyProfile();
          const data = (res as any)?.data ?? res;
          const p = data?.data ?? data;
          const name = p?.petName || first.name;
          const breed = p?.dogBreed?.name || first.breed;
          const birth = p?.petBirthDate || recoilBirth;
          const ageLabel = ageLabelFromBirth(birth) || first.ageLabel;
          const avatar = first.avatar; // 필요시 p.petImageUrl로 교체
          setMeta({ name, breed, ageLabel, avatar });
        } catch {
          /* noop */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoilName, recoilBreed, recoilBirth]);

  // 로컬 히스토리 로딩
  useEffect(() => {
    try {
      const KEY = 'marking_photos';
      const arr: PhotoState[] = JSON.parse(localStorage.getItem(KEY) || '[]');
      setHistory(Array.isArray(arr) ? arr : []);
    } catch {
      setHistory([]);
    }
  }, []);

  // 최신 + 히스토리 하나의 "동일 카드" 리스트로 병합(중복 제거)
  const items = useMemo(() => {
    const out: PhotoState[] = [];
    const seen = new Set<string>();
    const push = (p?: PhotoState | null) => {
      if (!p || !p.fileUrl) return;
      const key = `${p.fileUrl}|${p.ts ?? ''}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    };
    push(latest);
    history.forEach(push);
    return out;
  }, [latest, history]);

  return (
    <div className="min-h-screen bg-[#FEFFFA] flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 bg-[#FEFFFA] z-10 mb-3">
        <div className="relative h-12 flex items-center justify-center px-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 p-2 -ml-2 text-gray-600 cursor-pointer"
          >
            <FaChevronLeft />
          </button>
          <h1 className="text-[15px] font-semibold text-gray-800">마킹 포토존</h1>
        </div>
      </div>

      {/* 컨텐츠 */}
      <main className="mx-auto w-full max-w-[420px] px-4 pb-24">
        {/* 안내 배너 */}
        <div className="flex justify-center items-center bg-[#E0F2D9] text-[#498952] font-medium text-[12px] px-4 py-3 rounded-xl mb-4 leading-relaxed">
          2시간 전에 코코가 다녀갔어요.<br />꼬미의 흔적도 남겨볼까요?
        </div>

        {/* 리스트: 가로선으로 동일 형태 */}
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            아직 표시할 사진이 없어요.
          </p>
        ) : (
          <section className="divide-y divide-gray-200">
            {items.map((p, idx) => {
              const src = p.previewUrl || p.fileUrl || '';
              return (
                <article key={p.markingPhotoId || `${p.fileUrl}-${p.ts}-${idx}`} className="py-4">
                  {/* 상단 메타 행 */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar basePadding={2} />
                      <div className="leading-tight">
                        <div className="text-[13px] font-semibold text-gray-900">
                          {meta.name || '내 마킹'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {meta.breed || '믹스견/기타'}
                          {meta.ageLabel ? `, ${meta.ageLabel}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 pl-2 shrink-0">
                      {formatTime(p.ts)}
                    </div>
                  </div>

                  {/* 사진 카드 */}
                  <div className="mt-2 mb-2 rounded-2xl overflow-hidden border border-[#E5E7EB] w-[100%] h-[30vh] mx-auto">
                    <img src={src} alt="마킹 사진" className="w-full aspect-[3/2] object-cover" />
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* 플로팅 + 버튼 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#4FA65B] text-white text-2xl leading-none shadow-lg grid place-items-center cursor-pointer"
        aria-label="추가"
      >
        +
      </button>
    </div>
  );
};

export default MarkingPhotozone;
