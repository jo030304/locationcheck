import { useEffect, useRef } from 'react';
import { MdWaterDrop } from "react-icons/md";
import { renderToString } from "react-dom/server";

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap = ({
  markRequested,
  onMarkHandled,
  children,
}: {
  markRequested: boolean;
  onMarkHandled: () => void;
  children?: React.ReactNode;
}) => {
  const mapRef = useRef<any>(null);
  const currentPosRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

  // ✅ 지도 초기화 및 내 위치 화살표 마커
  useEffect(() => {
    const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        navigator.geolocation.getCurrentPosition((position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const map = new window.kakao.maps.Map(container, {
            center: new window.kakao.maps.LatLng(lat, lng),
            level: 3,
          });

          mapRef.current = map;
          currentPosRef.current = { lat, lng };

          // 🔵 내 위치 화살표 마커
          const markerContent = document.createElement('div');
          markerContent.innerHTML = `
            <svg id="lucide-icon" xmlns="http://www.w3.org/2000/svg"
              width="25" height="25" viewBox="0 0 24 24" fill="none"
              stroke="rgb(80,80,255)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              style="transform: rotate(0deg); transition: transform 0.3s ease;">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          `;

          const customOverlay = new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(lat, lng),
            content: markerContent,
            yAnchor: 1,
          });

          customOverlay.setMap(map);

          let lastHeading = 0;

          navigator.geolocation.watchPosition(
            (pos) => {
              const newLat = pos.coords.latitude;
              const newLng = pos.coords.longitude;
              const heading = pos.coords.heading;
              const speed = pos.coords.speed;

              currentPosRef.current = { lat: newLat, lng: newLng };

              const icon = markerContent.querySelector('#lucide-icon') as HTMLElement;
              const newPos = new window.kakao.maps.LatLng(newLat, newLng);

              customOverlay.setPosition(newPos);
              map.setCenter(newPos);

              if (icon && heading !== null && !isNaN(heading) && speed !== null && speed > 0.5) {
                const smoothed = lastHeading * 0.7 + heading * 0.3;
                lastHeading = smoothed;
                icon.style.transform = `rotate(${smoothed}deg)`;
              }
            },
            (err) => {
              console.error('위치 추적 실패:', err);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 100,
              timeout: 5000,
            }
          );
        });
      });
    };

    document.head.appendChild(script);
  }, []);

  // ✅ 마킹 버튼 누르면 현재 위치에 커스텀 마커 찍기
  useEffect(() => {
    if (markRequested && mapRef.current) {
      const { lat, lng } = currentPosRef.current;
      if (lat === 0 && lng === 0) return;

      const pos = new window.kakao.maps.LatLng(lat, lng);

      const iconHTML = renderToString(
        <MdWaterDrop style={{ width: "20px", height: "20px", color: "#4FA65B" }} />
      );

      const markerDiv = document.createElement('div');
      markerDiv.innerHTML = `
        <div style="
          background-color: #FFD86A;
          border-radius: 12px;
          padding: 4px;
          position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${iconHTML}
          <div style="
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 10px solid #FFD86A;
          "></div>
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: markerDiv,
        yAnchor: 1,
        zIndex: 5,
      });

      customOverlay.setMap(mapRef.current);
      mapRef.current.panTo(pos);
      onMarkHandled();
    }
  }, [markRequested]);

  return (
    <div className="relative w-screen h-screen">
      <div id="map" className="w-full h-full z-0" />
      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
};

export default KakaoMap;
