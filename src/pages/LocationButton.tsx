import { FaMapMarkerAlt } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function LocationButton() {
  const [cityDistrict, setCityDistrict] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("selected_address_cityDistrict");
    if (stored) setCityDistrict(stored);
  }, []);

  return (
    <div
      className="mx-7 my-3 border border-gray-300 rounded-4xl p-3 bg-[#FFFFFF] text-[#232323]
                 text-base sm:text-lg md:text-xl lg:text-2xl shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-center px-4">
        <FaMapMarkerAlt className="text-[#4FA65B] text-xl sm:text-2xl" />
        <span className="ml-2">
          {cityDistrict || "지역을 선택하세요"}
        </span>
      </div>
    </div>
  );
}
