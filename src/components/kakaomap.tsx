/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

const KakaoMap = () => {
  const mapRef = useRef<any>(null);
  const currentPosRef = useRef<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });

  useEffect(() => {
    const kakaoApiKey = import.meta.env.VITE_KAKAO_API_KEY;
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const map = new window.kakao.maps.Map(container, {
            center: new window.kakao.maps.LatLng(lat, lng),
            level: 3,
          });

          mapRef.current = map;
          currentPosRef.current = { lat, lng };

          // 🔵 현재 위치 화살표 마커
          const markerContent = document.createElement('div');
          markerContent.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25"
              stroke="rgb(80,80,255)" fill="none" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              style="transition: transform 0.3s ease;">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          `;

          const overlay = new window.kakao.maps.CustomOverlay({
            position: new window.kakao.maps.LatLng(lat, lng),
            content: markerContent,
            yAnchor: 1,
          });

          overlay.setMap(map);

          let lastHeading = 0;

          navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude, longitude, heading } = pos.coords;
              currentPosRef.current = { lat: latitude, lng: longitude };

              const newPos = new window.kakao.maps.LatLng(latitude, longitude);
              overlay.setPosition(newPos);
              map.setCenter(newPos);

              if (!isNaN(heading ?? NaN)) {
                const smoothed = lastHeading * 0.7 + heading! * 0.3;
                lastHeading = smoothed;
              }
            },
            (err) => console.error('위치 추적 실패:', err),
            {
              enableHighAccuracy: true,
              maximumAge: 100,
              timeout: 5000,
            }
          );

          // 📍 GeoJSON 경로 불러오기
          (async () => {
            try {
              const res = await fetch(
                'http://localhost:5000/api/walks/aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa/path'
              );
              const data = await res.json();

              if (
                !data ||
                data.type !== 'LineString' ||
                !Array.isArray(data.coordinates)
              ) {
                throw new Error('GeoJSON 데이터 형식 오류');
              }

              const pathCoords = data.coordinates.map(
                (coord: number[]) =>
                  new window.kakao.maps.LatLng(coord[1], coord[0])
              );

              const polyline = new window.kakao.maps.Polyline({
                path: pathCoords,
                strokeWeight: 5,
                strokeColor: '#FF0000',
                strokeOpacity: 0.7,
                strokeStyle: 'solid',
              });

              polyline.setMap(map);

              // 지도 중심을 경로 중간으로 이동
              if (pathCoords.length > 0) {
                const midIdx = Math.floor(pathCoords.length / 2);
                map.setCenter(pathCoords[midIdx]);
              }
            } catch (err) {
              console.error('경로 불러오기 실패:', err);
            }
          })();
        });
      });
    };

    document.head.appendChild(script);
  }, []);

  return <div id="map" className="w-full h-full" />;
};

export default KakaoMap;
