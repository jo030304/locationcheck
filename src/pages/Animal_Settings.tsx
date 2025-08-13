import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import {
  nameState,
  breedState,
  birthState,
  sizeState,
} from '../hooks/animalInfoAtoms';

import { FaChevronLeft, FaSearch } from 'react-icons/fa';
import Resister from '../hooks/Resister';
import { updateProfile } from '../services/users';

const Animal_Settings = () => {
  // ✅ Recoil을 단일 소스로 사용 (페이지 이동해도 유지)
  const [name, setName] = useRecoilState(nameState);
  const [breed, setBreed] = useRecoilState(breedState);
  const [birth, setBirth] = useRecoilState(birthState);
  const [size, setSize] = useRecoilState(sizeState);

  // 선택적: breedId는 선택됐을 때만 서버로 보낼 용도 (임시: local state)
  const [breedId, setBreedId] = useState<string | undefined>(undefined);

  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const isFormValid = Boolean(name && breed && birth && size);

  // ✅ SearchDog에서 고른 견종 반영 (처음 마운트 + 포커스 시)
  useEffect(() => {
    const applySelectedBreed = () => {
      const selName = localStorage.getItem('selected_breed');
      const selId = localStorage.getItem('selected_breed_id');
      if (selName) {
        setBreed(selName);                 // ← Recoil에 직접 반영
        setBreedId(selId || undefined);
        localStorage.removeItem('selected_breed');
        localStorage.removeItem('selected_breed_id');
      }
    };

    applySelectedBreed();
    const onFocus = () => applySelectedBreed();
    window.addEventListener('focus', onFocus);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selected_breed' || e.key === 'selected_breed_id') {
        applySelectedBreed();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [setBreed]);

  const handleSaveClick = () => setShowModal(true);

  const handleConfirm = async () => {
    try {
      const payload: any = {
        petName: name,
        petBirthDate: `20${birth.slice(0, 2)}-${birth.slice(2, 4)}-${birth.slice(4, 6)}`,
        petSize: size,
      };
      if (breedId) payload.breedId = breedId; // 있으면만 전송
      await updateProfile(payload);
    } catch (e) {
      // 서버 저장 실패해도 Recoil 값은 유지됨
    }
    setShowModal(false);
    navigate('/homepage');
  };

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5 relative">
      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          className="text-gray-600 cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          반려견에 대해 알려주세요!
        </h1>
      </div>

      {/* 이름 입력 */}
      <div className="mt-10 mb-4">
        <label className="block text-sm mb-2">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          maxLength={8}
          value={name}
          onChange={(e) => setName(e.target.value)}  // ← Recoil에 즉시 반영
          placeholder="이름을 입력해주세요 (최대 8자)"
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2"
        />
      </div>

      {/* 견종 입력 (SearchDog로 이동해 선택) */}
      <div className="mb-4 relative">
        <label className="block text-sm mb-2">
          견종 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={breed}
          onClick={() => navigate('/search_dog')}
          readOnly
          placeholder="터치해서 견종을 검색/선택하세요"
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 placeholder-gray-400 focus:outline-none focus:ring-2 cursor-pointer"
        />
        <FaSearch className="absolute right-3 top-[45px] text-gray-400" />
      </div>

      {/* 생년월일 입력 */}
      <div className="mb-4">
        <label className="block text-sm mb-2">
          생년월일 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}  // ← Recoil에 즉시 반영
          placeholder="예) 241120"
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2"
        />
      </div>

      {/* 크기 선택 */}
      <div className="mb-6">
        <label className="block text-sm mb-3">
          크기 <span className="text-red-500">*</span>
        </label>
        <div className="flex justify-center items-center gap-3">
          {['소형', '중형', '대형'].map((label) => (
            <button
              key={label}
              onClick={() => setSize(label as any)}     // ← Recoil에 즉시 반영
              className={`flex-1 py-3 rounded-xl border cursor-pointer ${
                size === label
                  ? 'bg-[#E0F2D9] border-2 border-[#498252] text-[#498252]'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              {label}
              <span className="text-sm flex flex-col text-gray-400">
                {label === '소형' && '(1~10kg)'}
                {label === '중형' && '(10~25kg)'}
                {label === '대형' && '(25kg 이상)'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        disabled={!isFormValid}
        onClick={handleSaveClick}
        className={`w-full py-3 rounded-xl text-white text-lg font-semibold transition ${
          isFormValid ? 'bg-[#4FA65B] cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        저장하기
      </button>
      {!isFormValid && (
        <p className="text-center text-sm text-gray-500 mt-2">
          모든 정보를 입력해주세요
        </p>
      )}

      {/* 모달 */}
      {showModal && (
        <Resister
          message="등록 완료!"
          subMessage="계정이 성공적으로 등록되었어요."
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default Animal_Settings;
