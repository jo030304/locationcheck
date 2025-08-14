// Avatar.tsx
import React from "react";

type AvatarProps = {
  imgSrc?: string;
  alt?: string;
  baseSize?: number;     // 지름(px)
  basePadding?: number;  // 내부 패딩(px)
  scale?: number;        // 스케일
  className?: string;
};

export default function Avatar({
  imgSrc = "/기본 마이 프로필.png",
  alt = "기본 마이 프로필",
  baseSize = 28,
  basePadding = 6,
  scale = 1,
  className = "",
}: AvatarProps) {
  const size = baseSize * scale;
  const padding = basePadding * scale;

  return (
    <div
      className={`rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size, padding }}
      role="img"
      aria-label={alt}
    >
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
