import { atom } from 'recoil';

// 현재 위치 전역 상태
export const currentLocationState = atom<{ lat: number; lng: number } | null>({
  key: 'currentLocationState',
  default: null,
});

// 위치 추적 ID (중복 방지용)
export const locationWatcherIdState = atom<number | undefined>({
  key: 'locationWatcherIdState',
  default: undefined,
});

export const walkRecordIdState = atom<string | null>({
  key: 'walkRecordIdState',
  default: null,
});

export const walkStartedAtState = atom<number | null>({
  key: 'walkStartedAtState',
  default: null,
});

export const walkDistanceMetersState = atom<number>({
  key: 'walkDistanceMetersState',
  default: 0,
});

export const walkMarkingCountState = atom<number>({
  key: 'walkMarkingCountState',
  default: 0,
});

export const tailcopterScoreState = atom<number | null>({
  key: 'tailcopterScoreState',
  default: null,
});

export const walkPathCoordinatesState = atom<number[][]>({
  key: 'walkPathCoordinatesState',
  default: [],
});

export const walkPausedState = atom<boolean>({
  key: 'walkPausedState',
  default: false,
});

// 지도 캡처 이미지
export const mapCaptureImageState = atom<string | null>({
  key: 'mapCaptureImageState',
  default: null,
});
