// src/services/locations.ts
export type ResolveLocationPayload = {
  addressFull: string;
  roadAddressName?: string | null;
  addressName?: string | null;
  cityDistrict?: string | null;
};

export async function resolveLocation(payload: ResolveLocationPayload) {
  const res = await fetch('/api/locations/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // 서버에서 에러 메시지를 내려주면 파싱해서 던져도 됨
    throw new Error('resolveLocation 실패');
  }
  // { location_id: string } 형태라고 가정
  return res.json() as Promise<{ location_id: string }>;
}
