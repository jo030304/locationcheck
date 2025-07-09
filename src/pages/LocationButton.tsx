import { FaMapMarkerAlt } from "react-icons/fa";

export default function LocationButton() {
  return (
    <div
      className="mx-7 my-3 border border-gray-300 rounded-4xl p-3 bg-[#FFFFFF] text-[#232323]
                 text-base sm:text-lg md:text-xl lg:text-2xl shadow-[0_2px_6px_0_rgba(0,0,0,0.15)]"
    >
      <div className="flex items-center px-4">
        <FaMapMarkerAlt className="text-[#4FA65B] text-xl sm:text-2xl" />
        <span className="ml-2">전주시 덕진구</span>
      </div>
    </div>
  );
}
