import { useNavigate } from "react-router-dom";

type Props = {
  to?: string;
  imgSrc?: string;
  alt?: string;
  baseSize?: number;     // 기준 지름(px)
  basePadding?: number;  // 기준 패딩(px)
  scale?: number;        // 전체 스케일
};

export default function Profile({
  to = "/my_profile",
  imgSrc = "/기본 마이 프로필.png",
  alt = "기본 마이 프로필",
  baseSize = 28,
  basePadding = 6,
  scale = 1,
}: Props) {
  const navigate = useNavigate();
  const size = baseSize * scale;
  const padding = basePadding * scale;

  return (
    <button
      type="button"
      className="rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer"
      style={{ width: size, height: size, padding }}
      aria-label="내 프로필로 이동"
      title="내 프로필"
      onClick={() => navigate('/my_profile')}
    >
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </button>
  );
}
