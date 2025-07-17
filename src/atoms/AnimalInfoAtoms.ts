import { atom } from 'recoil';

export const nameState = atom<string>({
  key: 'nameState',
  default: '',
});

export const breedState = atom<string>({
  key: 'breedState',
  default: '',
});

export const birthState = atom<string>({
  key: 'birthState',
  default: '',
});

export const sizeState = atom<"소형" | "중형" | "대형" | null>({
  key: 'sizeState',
  default: null,
});
