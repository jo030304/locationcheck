import { FaChevronLeft } from 'react-icons/fa';
import { SlMagnifier } from 'react-icons/sl';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchLocations } from '../services/onboarding';
import { updateProfile } from '../services/users';

declare global {
  interface Window {
    kakao: any;
  }
}

type PlaceItem = {
  addressName: string;
  roadAddressName: string;
  locationId: string | null; // ✅ 통일된 키
  city?: string;
  areaName?: string;
  province?: string;
};

const Neighborhood_Settings = () => {
  const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceItem[]>([]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services`;
    script.async = false;
    document.head.appendChild(script);
  }, []);

  const handleSearch = async (keyword: string) => {
    if (!keyword) {
      setPlaces([]);
      return;
    }
    try {
      const res = await searchLocations(keyword);
      const list = (res?.data ?? res ?? []) as any[];

      // ✅ 응답 정규화
      const normalized: PlaceItem[] = list.map((p: any) => {
        const addressName = p.addressName ?? p.address_name ?? '';
        const roadAddressName = p.roadAddressName ?? p.road_address_name ?? '';
        return {
          addressName,
          roadAddressName,
          locationId: p.locationId ?? p.location_id ?? p.id ?? null,
          city: p.city,
          areaName: p.areaName,
          province: p.province,
        };
      });
      setPlaces(normalized);
    } catch (e) {
      // fallback: 카카오 클라이언트 검색 (여긴 ID 없음)
      if (window.kakao?.maps?.services) {
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(keyword, (data: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const normalized: PlaceItem[] = data.map((p: any) => ({
              addressName: p.address_name ?? '',
              roadAddressName: p.road_address_name ?? '',
              locationId: null,
            }));
            setPlaces(normalized);
          } else {
            setPlaces([]);
          }
        });
      }
    }
  };

  const handleSelect = async (place: PlaceItem) => {
    const address = place.roadAddressName || place.addressName || '';
    setQuery(address);
    setPlaces([]);

    // city/areaName 우선, 없으면 문자열에서 추론
    const cityDistrict =
      (place.city && place.areaName)
        ? `${place.city} ${place.areaName}`
        : (() => {
            const parts = address.split(' ');
            return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : address;
          })();

    // 로컬 저장
    localStorage.setItem('selected_address_full', address);
    localStorage.setItem('selected_address_cityDistrict', cityDistrict);

    // 백엔드 전송 (주소 문자열은 항상, ID는 있을 때만)
    const payload: any = {
      preferredAddressFull: address,
      preferredAddressCityDistrict: cityDistrict,
    };
    if (place.locationId) payload.preferredLocationId = place.locationId;

    console.log('선택 주소(표시용):', address);
    console.log('locationId(저장용, 있을 때만):', place.locationId ?? '(없음)');

    try {
      await updateProfile(payload);
    } catch (e) {
      console.warn('updateProfile 실패:', e);
    }

    if (place.locationId) {
      localStorage.setItem('selected_location_id', place.locationId);
    } else {
      localStorage.removeItem('selected_location_id');
    }

    navigate('/animal_setting');
  };

  return (
    <div className="relative z-0 min-h-screen bg-[#FEFFFA] p-5 flex flex-col">
      {/* 🔒 고정 배경 이미지 (워터마크) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center">
        <img
          src="/동네 설정 사진.png"
          alt=""
          className="w-[230px] h-[230px] object-contain opacity-20"
        />
      </div>

      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          onClick={() => navigate('/agree_ment')}
          className="text-gray-600 z-10 cursor-pointer"
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
          산책할 동네를 설정해 주세요!
        </h1>
      </div>

      {/* 검색창 */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="지번, 도로명, 건물명 검색"
            className="w-full bg-white px-4 pr-10 h-12 rounded-lg border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2"
          />
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center"
            aria-hidden="true"
          >
            <SlMagnifier className="text-gray-400" />
          </span>
        </div>

        {places.length > 0 && (
          <ul className="w-full mt-2 space-y-1 cursor-pointer">
            {places.map((place, index) => (
              <li
                key={index}
                onClick={() => handleSelect(place)}
                className="px-1 py-2 border-b border-gray-200"
              >
                <p className="text-sm font-medium text-black">
                  {place.roadAddressName || place.addressName}
                </p>
                <p className="text-xs text-gray-500 mt-2 mb-3">
                  {place.addressName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 하단 여유 공간(필요 시 유지) */}
      <div className="flex-1" />
    </div>
  );
};

export default Neighborhood_Settings;
