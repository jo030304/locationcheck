import { FaChevronLeft } from 'react-icons/fa';
import { SlMagnifier } from 'react-icons/sl';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type KakaoPlace = {
  address_name?: string;
  road_address_name?: string;
};

type PlaceItem = {
  addressName: string;
  roadAddressName: string;
  locationId: string | null;
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
    // Kakao Maps SDK 로드 (이미 로드되어 있으면 스킵)
    if (window.kakao?.maps?.services) return;
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services`;
    script.async = true;
    document.head.appendChild(script);
  }, [kakaoApiKey]);

  const handleSearch = (keyword: string) => {
    if (!keyword) {
      setPlaces([]);
      return;
    }
    if (!window.kakao?.maps?.services) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: KakaoPlace[], status: string) => {
      const ok = window.kakao?.maps?.services?.Status?.OK;
      if (ok && status === ok) {
        const normalized: PlaceItem[] = (data ?? []).map((p: KakaoPlace) => ({
          addressName: p.address_name ?? '',
          roadAddressName: p.road_address_name ?? '',
          locationId: null,
        }));
        setPlaces(normalized);
      } else {
        setPlaces([]);
      }
    });
  };

  const handleSelect = async (place: PlaceItem) => {
    const address = place.roadAddressName || place.addressName || '';
    setQuery(address);
    setPlaces([]);

    const cityDistrict =
      place.city && place.areaName
        ? `${place.city} ${place.areaName}`
        : (() => {
            const parts = address.split(' ');
            return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : address;
          })();

    localStorage.setItem('selected_address_full', address);
    localStorage.setItem('selected_address_cityDistrict', cityDistrict);

    navigate('/animal_setting');
  };

  return (
    <div className="relative z-0 min-h-screen min-h-[100lvh] bg-[#FEFFFA] px-4 pt-4 overscroll-contain group">
      {/* 🔒 가운데 고정 워터마크 */}
      {/* 키보드 올라와도 '처음 화면의 가운데' 유지: fixed + top:[50lvh] */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-1/2 top-[50lvh] -translate-x-1/2 -translate-y-1/2 -z-10
              transition-opacity duration-200 group-focus-within:opacity-0 group-focus-within:invisible"
      >
        <img
          src="/동네 설정 사진.png"
          alt=""
          className="w-[230px] h-[230px] object-contain opacity-20 select-none"
        />
      </div>

      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          onClick={() => navigate(-1)}
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
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
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

      <div className="flex-1" />
    </div>
  );
};

export default Neighborhood_Settings;
