type Props = {
  onClick: () => void;
};

export default function MyLocationButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-36 right-4 z-51 bg-white p-3 rounded-full shadow-md"
    >
      <img src="/assets/location-icon.svg" alt="내 위치로 이동" className="w-6 h-6" />
    </button>
  );
}
