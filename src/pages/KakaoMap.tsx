// 🟩 KakaoMap.tsx
import { useEffect } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap = ({ children }: { children?: React.ReactNode }) => {
  useEffect(() => {
    const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        let lastHeading = 0;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const map = new window.kakao.maps.Map(container, {
              center: new window.kakao.maps.LatLng(lat, lng),
              level: 3,
            });

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

            navigator.geolocation.watchPosition(
              (pos) => {
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;
                const heading = pos.coords.heading;
                const speed = pos.coords.speed;

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
                timeout: 10000,
              }
            );
          },
          (error) => {
            console.error('위치 정보를 가져오는 데 실패했습니다.', error);
            const fallbackOptions = {
              center: new window.kakao.maps.LatLng(37.5665, 126.9780),
              level: 3,
            };
            new window.kakao.maps.Map(container, fallbackOptions);
          }
        );
      });
    };

    document.head.appendChild(script);
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <div id="map" className="w-full h-full z-0" />
      {/* 지도 위에 덮을 children */}
      <div className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default KakaoMap;
