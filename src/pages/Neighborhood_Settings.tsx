import { FaChevronLeft } from "react-icons/fa";
import { SlMagnifier } from "react-icons/sl";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    kakao: any;
  }
}

const Neighborhood_Settings = () => {
  const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<any[]>([]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services`;
    script.async = false;
    document.head.appendChild(script);
  }, []);

  const handleSearch = (keyword: string) => {
    if (!keyword || !window.kakao?.maps?.services) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        setPlaces(data);
      } else {
        setPlaces([]);
      }
    });
  };

  const handleSelect = (address: string) => {
    setQuery(address);
    setPlaces([]);

    const parts = address.split(" ");
    const cityDistrict = parts.length >= 3 ? `${parts[1]} ${parts[2]}` : address;

    localStorage.setItem("selected_address_full", address);
    localStorage.setItem("selected_address_cityDistrict", cityDistrict);

    console.log("전체 주소:", address);
    console.log("시/구:", cityDistrict);

    navigate("/animal_setting");
  };

  return (
    <div className="min-h-screen bg-[#FEFFFA] p-5 flex flex-col">
      {/* 헤더 */}
      <div className="relative flex items-center mb-6">
        <FaChevronLeft
          onClick={() => navigate("/agree_ment")}
          className="text-gray-600 z-10 cursor-pointer"
        />
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-800">
          산책할 동네를 설정해 주세요!
        </h1>
      </div>

      {/* 검색창 */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          placeholder="지번, 도로명, 건물명 검색"
          className="w-full bg-white px-4 py-3 pr-10 rounded-lg border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2"
        />
        <SlMagnifier className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

        {places.length > 0 && (
          <ul className="absolute z-20 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-md max-h-48 overflow-auto">
            {places.map((place, index) => (
              <li
                key={index}
                onClick={() => handleSelect(place.road_address_name || place.address_name)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <p className="font-semibold text-sm text-gray-800">{place.road_address_name || place.address_name}</p>
                <p className="text-xs text-gray-500">{place.address_name}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 이미지 */}
      <div className="flex-grow flex justify-center items-center">
        <img
          src="/동네 설정 사진.png"
          alt="동네 설정 일러스트"
          className="w-[230px] h-[230px] object-contain opacity-20"
        />
      </div>
    </div>
  );
};

export default Neighborhood_Settings;
