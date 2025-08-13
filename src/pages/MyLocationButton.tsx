import { PiGps } from "react-icons/pi";

type Props = {
  onClick: () => void;
};

export default function MyLocationButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-4 right-4 z-51 bg-white p-3 rounded-full shadow-md cursor-pointer"
    >
      <PiGps className="w-6 h-6 text-[#4FA65B]" style={{ strokeWidth: 5 }} />
    </button>
  );
}
