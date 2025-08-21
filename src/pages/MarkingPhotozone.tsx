// MarkingPhotozone.tsx
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getPhotozoneDetails } from '../services/marking';
import { FaChevronLeft } from 'react-icons/fa';
import { useRecoilValue } from 'recoil';
import { nameState, breedState, birthState } from '../hooks/animalInfoAtoms';
import { getMyProfile } from '../services/users';
import Avatar from '../hooks/Avatar';

type PhotoState = {
  fileUrl?: string; // 영구 저장용(DataURL)
  previewUrl?: string; // 즉시 표시용(ObjectURL, 세션동안만)
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
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 +
    (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 12) return `${months}개월`;
  return `${Math.floor(months / 12)}살`;
};

const SS_KEY = 'last_marking_photo';

type MarkingPhotozoneProps = {
  courseId?: string | number;
  photozoneId?: string;
  onClose?: () => void;
};

const MarkingPhotozone = (props: MarkingPhotozoneProps = {}) => {
  const { state } = useLocation() as {
    state?: PhotoState & { courseId?: string | number; photozoneId?: string };
  };
  const effectiveCourseId = props.courseId ?? state?.courseId;
  const effectivePhotozoneId = props.photozoneId ?? state?.photozoneId;

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
  const [coursePhotos, setCoursePhotos] = useState<PhotoState[]>([]);
  const [loading, setLoading] = useState(false);

  // ---------- 카메라/파일 입력 ----------
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openCamera = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const readAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  const getCurrentPosition = (): Promise<{ lat?: number; lng?: number }> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });

  const persistToLocal = (item: PhotoState) => {
    // 로컬스토리지에 포토존/마킹 정보를 저장하지 않습니다. 메모리 상태로만 유지합니다.
    setHistory((prev) => {
      const key = `${item.fileUrl}|${item.ts ?? ''}`;
      const seen = new Set(
        (prev || []).map((x) => `${x.fileUrl}|${x.ts ?? ''}`)
      );
      if (seen.has(key)) return prev;
      const next = [item, ...(prev || [])];
      // 필요 시 메모리상 제한 (200개)
      if (next.length > 200) next.length = 200;
      return next;
    });
  };

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      const ts = Date.now();
      const [dataUrl, pos] = await Promise.all([
        readAsDataURL(f),
        getCurrentPosition(),
      ]);

      // 영구 저장본(fileUrl=DataURL) + 즉시 표시용(previewUrl=ObjectURL)
      const newItem: PhotoState = {
        fileUrl: dataUrl,
        previewUrl: URL.createObjectURL(f),
        lat: pos.lat,
        lng: pos.lng,
        ts,
      };

      // 최신/세션 갱신
      setLatest((prev) => {
        // 이전 preview URL 메모리 정리
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return newItem;
      });
      sessionStorage.setItem(SS_KEY, JSON.stringify(newItem));

      // 로컬 히스토리에 반영
      persistToLocal({ ...newItem, previewUrl: undefined });

      // 입력값 초기화(같은 파일 다시 찍어도 change 이벤트 나가게)
      e.target.value = '';
    },
    []
  );

  // ---------- 최신(방금 찍은) 사진 복구 ----------
  useEffect(() => {
    // 모달로 특정 포토존을 열었다면, 세션 최신 미리보기는 사용하지 않음(서버 집계 사진만)
    if (effectivePhotozoneId) {
      setLatest(null);
      return;
    }
    const fromState =
      state && (state.previewUrl || state.fileUrl) ? state : null;
    if (fromState) {
      setLatest(fromState);
      sessionStorage.setItem(SS_KEY, JSON.stringify(fromState));
    } else {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        try {
          setLatest(JSON.parse(raw));
        } catch {
          /* noop */
        }
      }
    }
    return () => {
      // 언마운트 시 최신 previewUrl 해제
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        try {
          const p = JSON.parse(raw) as PhotoState;
          if (p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
        } catch {
          /* noop */
        }
      }
    };
  }, [state]);

  // ---------- 코스 포토존 집계 사진 조회 (핀 클릭 진입 시) ----------
  useEffect(() => {
    const photozoneId = effectivePhotozoneId;
    if (!photozoneId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getPhotozoneDetails(String(photozoneId));
        const data: any = (res as any)?.data ?? res;
        const d = data?.data ?? data;
        const photos = Array.isArray(d?.photos)
          ? d.photos
          : Array.isArray(d?.data?.photos)
            ? d.data.photos
            : [];
        console.info('[MarkingPhotozone] details fetched', {
          photozoneId,
          keys: Object.keys(d || {}),
          photosCount: Array.isArray(photos) ? photos.length : 0,
          sample: Array.isArray(photos) && photos.length ? photos[0] : null,
        });
        const mapped: PhotoState[] = photos
          .map((p: any) => {
            const fileUrl =
              p?.photo_url ||
              p?.photoUrl ||
              p?.image_url ||
              p?.imageUrl ||
              p?.url ||
              '';
            const ts = p?.created_at || p?.createdAt || undefined;
            const markingPhotoId =
              p?.photo_id || p?.photoId || p?.id || undefined;
            return { fileUrl, ts, markingPhotoId } as PhotoState;
          })
          .filter((x) => x.fileUrl);
        if (!cancelled) setCoursePhotos(mapped);
      } catch {
        if (!cancelled) setCoursePhotos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectivePhotozoneId]);

  // ---------- 내 정보 메타 채우기 (Recoil → 부족하면 서버) ----------
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
          setMeta({ name, breed, ageLabel });
        } catch {
          /* noop */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoilName, recoilBreed, recoilBirth]);

  // ---------- 로컬 히스토리 로딩 제거 (메모리 상태로만 유지) ----------
  useEffect(() => {
    setHistory([]);
  }, []);

  // ---------- 최신 + 히스토리 병합(중복 제거) ----------
  const items = useMemo(() => {
    const out: PhotoState[] = [];
    const seen = new Set<string>();
    const push = (p?: PhotoState | null) => {
      if (!p || !(p.previewUrl || p.fileUrl)) return;
      const key = `${p.fileUrl ?? ''}|${p.ts ?? ''}`;
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
      {/* 숨김 파일 입력(카메라) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 헤더 */}
      <div className="sticky top-0 bg-[#FEFFFA] z-10 mb-3">
        <div className="relative h-12 flex items-center justify-center px-4">
          {props.onClose ? (
            <button
              onClick={props.onClose}
              className="absolute left-4 p-2 -ml-2 text-gray-600 cursor-pointer"
            >
              <FaChevronLeft />
            </button>
          ) : (
            <button
              onClick={() =>
                history.length > 0
                  ? window.history.back()
                  : window.history.go(-1)
              }
              className="absolute left-4 p-2 -ml-2 text-gray-600 cursor-pointer"
            >
              <FaChevronLeft />
            </button>
          )}
          <h1 className="text-[15px] font-semibold text-gray-800">
            마킹 포토존
          </h1>
        </div>
      </div>

      {/* 컨텐츠 */}
      <main className="mx-auto w-full max-w-[420px] px-4 pb-24">
        {/* 안내 배너 */}
        <div className="flex justify-center items-center bg-[#E0F2D9] text-[#498952] font-medium text-[12px] px-4 py-3 rounded-xl mb-4 leading-relaxed">
          2시간 전에 코코가 다녀갔어요.
          <br />
          꼬미의 흔적도 남겨볼까요?
        </div>

        {/* 리스트 */}
        {loading ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            불러오는 중…
          </p>
        ) : items.length === 0 && coursePhotos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-500">
            아직 표시할 사진이 없어요.
          </p>
        ) : (
          <section className="divide-y divide-gray-200">
            {[...coursePhotos, ...items].map((p, idx) => {
              const src = p.fileUrl || p.previewUrl || '';
              return (
                <article
                  key={p.markingPhotoId || `${p.fileUrl}-${p.ts}-${idx}`}
                  className="py-4"
                >
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
                    <img
                      src={src}
                      alt="마킹 사진"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* 플로팅 + 버튼 → 카메라 열기 */}
      <button
        type="button"
        onClick={openCamera}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#4FA65B] text-white text-2xl leading-none shadow-lg grid place-items-center cursor-pointer"
        aria-label="사진 촬영"
      >
        +
      </button>
    </div>
  );
};

export default MarkingPhotozone;
