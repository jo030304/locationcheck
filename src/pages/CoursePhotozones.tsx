import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { addPhotoToPhotozone, getPhotozoneDetails } from '../services/marking';
import { createPresignedUrl, uploadToS3 } from '../services/upload';
import { useRecoilValue } from 'recoil';
import { walkRecordIdState } from '../hooks/walkAtoms';

export default function CoursePhotozones() {
  const location = useLocation();
  const photozones: any[] = location.state?.photozones || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<any>(null);
  const activeWalkRecordId = useRecoilValue(walkRecordIdState);

  useEffect(() => {
    (async () => {
      if (!selectedId) return;
      try {
        const res = await getPhotozoneDetails(selectedId);
        const data = (res as any)?.data ?? res;
        setDetails(data?.data ?? data);
      } catch (e) {
        setDetails(null);
      }
    })();
  }, [selectedId]);

  const handleAddPhoto = async (file: File) => {
    if (!selectedId) return;
    if (!activeWalkRecordId) {
      alert('사진 추가는 진행 중인 산책이 있을 때만 가능합니다.');
      return;
    }
    const pre = await createPresignedUrl({
      fileName: file.name,
      fileType: (file.type as any) || 'image/jpeg',
      uploadType: 'marking',
    });
    const d = (pre as any)?.data ?? pre;
    const uploadUrl = d?.data?.uploadUrl || d?.uploadUrl;
    const fileUrl = d?.data?.fileUrl || d?.fileUrl;
    if (uploadUrl) await uploadToS3(uploadUrl, file);
    if (fileUrl)
      await addPhotoToPhotozone(selectedId, {
        photoUrl: fileUrl,
        walkRecordId: activeWalkRecordId,
      });
  };

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5">
      <h1 className="text-xl font-semibold mb-4">코스 포토존</h1>
      <div className="space-y-3">
        {photozones.map((pz: any) => (
          <button
            key={pz.photozone_id || pz.id}
            className={`w-full text-left border rounded-xl p-3 bg-white cursor-pointer ${selectedId === (pz.photozone_id || pz.id) ? 'border-green-500' : ''}`}
            onClick={() => setSelectedId(pz.photozone_id || pz.id)}
          >
            <div className="font-medium">
              {pz.name || pz.photozone_name || '포토존'}
            </div>
            <div className="text-sm text-gray-500">
              {pz.latitude}, {pz.longitude}
            </div>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="mt-5 border rounded-xl p-3 bg-white">
          <div className="font-medium mb-2">선택한 포토존 상세</div>
          {!details && (
            <div className="text-sm text-gray-500">불러오는 중...</div>
          )}
          {details && (
            <div className="space-y-2">
              <div>
                추천여부:{' '}
                {String(
                  details?.data?.photozone?.is_recommended ??
                    details?.photozone?.is_recommended ??
                    false
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(details?.data?.photos || details?.photos || []).map(
                  (p: any, idx: number) => (
                    <img
                      key={idx}
                      src={p.photo_url}
                      className="w-full rounded"
                    />
                  )
                )}
              </div>
            </div>
          )}
          <div className="mt-3">
            <label className="text-sm">사진 추가</label>
            <input
              type="file"
              accept="image/*"
              className="block mt-1"
              disabled={!activeWalkRecordId}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await handleAddPhoto(f);
                e.currentTarget.value = '';
              }}
            />
            {!activeWalkRecordId && (
              <div className="text-xs text-gray-500 mt-1">
                진행 중인 산책에서만 사진을 추가할 수 있어요.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
