import { useEffect } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap = () => {
  useEffect(() => {
    const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            const options = {
              center: new window.kakao.maps.LatLng(lat, lng),
              level: 3,
            };

            const map = new window.kakao.maps.Map(container, options);

            // 직접 삽입한 Lucide SVG 아이콘
            const markerContent = document.createElement('div');
            markerContent.innerHTML = `
              <svg id="lucide-icon" xmlns="http://www.w3.org/2000/svg"
                width="32" height="32" viewBox="0 0 24 24" fill="none"
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
                const heading = pos.coords.heading;
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;

                customOverlay.setPosition(
                  new window.kakao.maps.LatLng(newLat, newLng)
                );

                const icon = markerContent.querySelector('#lucide-icon') as HTMLElement;
                if (icon && heading !== null && !isNaN(heading)) {
                  icon.style.transform = `rotate(${heading}deg)`;
                }
              },
              (err) => {
                console.error('위치 추적 실패:', err);
              },
              {
                enableHighAccuracy: false,
                maximumAge: 5000,
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

  return <div id="map" style={{ width: '100%', height: '100%' }} />;
};

export default KakaoMap;
