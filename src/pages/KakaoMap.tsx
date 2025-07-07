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
                width="8" height="8" viewBox="0 0 24 24" fill="none"
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

                // 위치 이동
                const newPos = new window.kakao.maps.LatLng(newLat, newLng);
                customOverlay.setPosition(newPos);
                map.setCenter(newPos); // 지도 중심 이동

                // 방향 회전 - 속도 필터링 + 스무딩 처리
                if (icon && heading !== null && !isNaN(heading) && speed !== null && speed > 0.5) {
                  // 스무딩: 이전 heading과 현재 heading의 평균
                  const smoothed = lastHeading * 0.7 + heading * 0.3;
                  lastHeading = smoothed;
                  icon.style.transform = `rotate(${smoothed}deg)`;
                }
              },
              (err) => {
                console.error('위치 추적 실패:', err);
              },
              {
                enableHighAccuracy: true,     // ✅ 고정밀 위치 사용
                maximumAge: 100,              // ✅ 캐싱 거의 안 함
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
