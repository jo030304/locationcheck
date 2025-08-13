import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { MdWaterDrop } from 'react-icons/md';
import { renderToString } from 'react-dom/server';
import { useRecoilValue } from 'recoil';
import { currentLocationState } from '../hooks/walkAtoms';
import { takeScreenshot } from '@xata.io/screenshot';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  markRequested: boolean;
  onMarkHandled: () => void;
  moveToMyLocationRequested?: boolean;
  onMoveHandled?: () => void;
  walkId?: string;
  drawingEnabled?: boolean;
  onDistanceChange?: (dist: number) => void;
  onPathUpdate?: (coord: { lat: number; lng: number }) => void;
  children?: React.ReactNode;
  initialPosition?: { lat: number; lng: number } | null;
  testMode?: boolean;
}

const KakaoMap = forwardRef(function KakaoMap(
  {
    markRequested,
    onMarkHandled,
    moveToMyLocationRequested,
    onMoveHandled,
    walkId,
    drawingEnabled = true,
    onDistanceChange,
    onPathUpdate,
    children,
    initialPosition,
    testMode = false,
  }: KakaoMapProps,
  ref
) {
  const mapRef = useRef<any>(null);
  const currentPosRef = useRef<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });
  // keep only refs to avoid unused state warnings
  const coordinatesRef = useRef<{ lat: number; lng: number }[]>([]);
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const totalDistanceRef = useRef(0);
  const customOverlayRef = useRef<any>(null);
  const mapInitializedRef = useRef(false);
  const polylineRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const childrenWrapperRef = useRef<HTMLDivElement>(null);

  // 전역 위치 상태 구독
  const globalLocation = useRecoilValue(currentLocationState);

  // 로딩 상태 추가
  const [isLocationLoading, setIsLocationLoading] = useState(!initialPosition && !globalLocation);

  // 지도 스크린샷 캡처 함수 - 실제 지도 캡처 시도
  const captureMap = async (): Promise<string | null> => {
    if (!mapContainerRef.current || !mapRef.current) {
      console.log('지도 또는 컨테이너가 없습니다');
      return null;
    }

    try {
      // 먼저 전체 경로를 지도에 표시
      if (coordinatesRef.current && coordinatesRef.current.length > 0) {
        showFullPath(coordinatesRef.current);

        // 지도 렌더링 대기
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // @xata.io/screenshot으로 실제 UI 캡처 시도
      console.log('@xata.io/screenshot으로 지도 캡처 시작');

      try {
        // 1. 모든 UI 요소 숨기기
        // 지도 컨트롤 숨기기
        const controls = mapContainerRef.current.querySelectorAll('[class*="control"]');
        controls.forEach((el: any) => {
          el.style.display = 'none';
        });

        // children (Record, Operator 등) 숨기기
        if (childrenWrapperRef.current) {
          childrenWrapperRef.current.style.display = 'none';
        }

        // 렌더링 대기
        await new Promise(resolve => setTimeout(resolve, 100));

        // 스크린샷 캡처
        const screenshot = await takeScreenshot();

        if (screenshot) {
          // 2. 모든 UI 요소 복원
          // 컨트롤 복원
          controls.forEach((el: any) => {
            el.style.display = '';
          });

          // children 복원
          if (childrenWrapperRef.current) {
            childrenWrapperRef.current.style.display = '';
          }

          console.log('지도 캡처 성공 - 전체 화면 사용');
          return screenshot; // 전체 화면 그대로 반환
        }

        throw new Error('스크린샷 변환 실패');

      } catch (imageError) {
        console.log('@xata.io/screenshot 실패, Canvas 대체 방법 사용:', imageError);

        // UI 복원 (실패 시에도 복원 필요)
        const controls = mapContainerRef.current.querySelectorAll('[class*="control"]');
        controls.forEach((el: any) => {
          el.style.display = '';
        });

        if (childrenWrapperRef.current) {
          childrenWrapperRef.current.style.display = '';
        }

        // 대체 방법: Canvas로 경로만 그리기
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 깨끗한 흰색 배경
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 좌표가 없으면 빈 캔버스 반환
        if (!coordinatesRef.current || coordinatesRef.current.length === 0) {
          return canvas.toDataURL('image/png');
        }

        // 좌표 범위 계산
        const coords = coordinatesRef.current;
        const minLat = Math.min(...coords.map(c => c.lat));
        const maxLat = Math.max(...coords.map(c => c.lat));
        const minLng = Math.min(...coords.map(c => c.lng));
        const maxLng = Math.max(...coords.map(c => c.lng));

        // 패딩 추가 (20% 여백)
        const padding = 0.2;
        const latRange = maxLat - minLat || 0.001;
        const lngRange = maxLng - minLng || 0.001;

        // 비율 유지를 위한 스케일 조정
        const aspectRatio = canvas.width / canvas.height;
        const dataAspectRatio = lngRange / latRange;

        let adjustedLatRange = latRange;
        let adjustedLngRange = lngRange;

        if (dataAspectRatio > aspectRatio) {
          adjustedLatRange = lngRange / aspectRatio;
        } else {
          adjustedLngRange = latRange * aspectRatio;
        }

        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        // 좌표를 캔버스 좌표로 변환하는 함수
        const toCanvasX = (lng: number) => {
          const normalized = (lng - (centerLng - adjustedLngRange / 2)) / adjustedLngRange;
          return normalized * canvas.width * (1 - padding) + canvas.width * padding / 2;
        };

        const toCanvasY = (lat: number) => {
          const normalized = (lat - (centerLat - adjustedLatRange / 2)) / adjustedLatRange;
          return canvas.height - (normalized * canvas.height * (1 - padding) + canvas.height * padding / 2);
        };

        // 경로 그리기 (녹색 선)
        ctx.strokeStyle = '#4FA65B';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        coords.forEach((coord, index) => {
          const x = toCanvasX(coord.lng);
          const y = toCanvasY(coord.lat);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // 시작점 마커
        const startX = toCanvasX(coords[0].lng);
        const startY = toCanvasY(coords[0].lat);
        ctx.fillStyle = '#4FA65B';
        ctx.beginPath();
        ctx.arc(startX, startY, 6, 0, Math.PI * 2);
        ctx.fill();

        // 끝점 마커
        if (coords.length > 1) {
          const endX = toCanvasX(coords[coords.length - 1].lng);
          const endY = toCanvasY(coords[coords.length - 1].lat);
          ctx.fillStyle = '#FF5252';
          ctx.beginPath();
          ctx.arc(endX, endY, 6, 0, Math.PI * 2);
          ctx.fill();
        }

        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      console.error('경로 이미지 생성 실패:', error);
      return null;
    }
  };

  // 전체 경로 표시 함수
  const showFullPath = (coordinates: { lat: number; lng: number }[]) => {
    if (!mapRef.current || !window.kakao || coordinates.length === 0) return;

    // 기존 polyline 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // 경로 그리기
    const path = coordinates.map(coord =>
      new window.kakao.maps.LatLng(coord.lat, coord.lng)
    );

    polylineRef.current = new window.kakao.maps.Polyline({
      path: path,
      strokeWeight: 5,
      strokeColor: '#4FA65B',
      strokeOpacity: 0.8,
      strokeStyle: 'solid'
    });

    polylineRef.current.setMap(mapRef.current);

    // 경로가 모두 보이도록 지도 범위 설정
    const bounds = new window.kakao.maps.LatLngBounds();
    coordinates.forEach(coord => {
      bounds.extend(new window.kakao.maps.LatLng(coord.lat, coord.lng));
    });
    mapRef.current.setBounds(bounds);
  };

  // 카카오맵 Static Map URL 생성
  const getStaticMapUrl = (coordinates: { lat: number; lng: number }[]): string | null => {
    if (coordinates.length === 0) return null;

    // 중심점 계산
    const centerLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
    const centerLng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;

    // Polyline 좌표 문자열 생성 (최대 100개 포인트)
    const polylineCoords = coordinates
      .slice(0, 100)
      .map(c => `${c.lng},${c.lat}`)
      .join('|');

    // Static Map URL 생성
    const baseUrl = 'https://dapi.kakao.com/v2/maps/staticmap';
    const params = new URLSearchParams({
      center: `${centerLng},${centerLat}`,
      level: '5',
      size: '400x300',
      markers: '',
      polyline: `5|0xFF4FA65B|0.8|solid|${polylineCoords}`
    });

    return `${baseUrl}?${params.toString()}`;
  };

  function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // m
  }

  // removed speed-based color interpolation for now to reduce lints

  // ✅ 지도 초기화 및 내 위치 화살표 마커
  const initialPosRef = useRef(initialPosition);

  useEffect(() => {
    const pos = initialPosRef.current;
    let initialLat = 36.5;
    let initialLng = 127.5;
    let initialLevel = 13;

    if (pos) {
      initialLat = pos.lat;
      initialLng = pos.lng;
      initialLevel = 5;
      currentPosRef.current = pos;
    }

    const map = new window.kakao.maps.Map(container, {
      center: new window.kakao.maps.LatLng(initialLat, initialLng),
      level: initialLevel,
    });
    mapRef.current = map;
    console.log('🗺️ 지도 초기화 완료:', initialPosition ? '현재 위치' : '한반도 뷰');

    // 초기 위치가 있으면 마커 생성
    if (initialPosition) {
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
        position: new window.kakao.maps.LatLng(initialPosition.lat, initialPosition.lng),
        content: markerContent,
        yAnchor: 1,
      });

      customOverlay.setMap(map);
      customOverlayRef.current = customOverlay;
    }

    mapInitializedRef.current = true;

    // 3. 탭 전환 감지 - 돌아왔을 때 현재 위치로 이동
    const handleVisibilityChange = () => {
      if (!document.hidden && mapRef.current && currentPosRef.current.lat !== 0) {
        console.log('📱 탭으로 돌아옴 - 현재 위치로 이동');
        const pos = new window.kakao.maps.LatLng(
          currentPosRef.current.lat,
          currentPosRef.current.lng
        );
        mapRef.current.panTo(pos);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // cleanup 함수
    return () => {
      console.log('🧹 KakaoMap cleanup');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mapInitializedRef.current = false;
    };
  }, []);

  // ✅ 전역 위치 변경 감지
  useEffect(() => {
    // 테스트 모드일 때는 실제 GPS 무시
    if (testMode) {
      console.log('🔒 테스트 모드 활성화 - GPS 추적 일시 중지');
      return;
    }

    if (!globalLocation || !mapRef.current) return;

    const { lat, lng } = globalLocation;
    currentPosRef.current = { lat, lng };

    // 첫 위치를 받았을 때
    if (isLocationLoading) {
      setIsLocationLoading(false);

      // 지도 중심 이동
      const currentPos = new window.kakao.maps.LatLng(lat, lng);
      mapRef.current.panTo(currentPos);
      mapRef.current.setLevel(5);

      // 마커가 없으면 생성
      if (!customOverlayRef.current) {
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
          position: currentPos,
          content: markerContent,
          yAnchor: 1,
        });

        customOverlay.setMap(mapRef.current);
        customOverlayRef.current = customOverlay;
      }
    }

    // 위치 업데이트
    const newCoord = { lat, lng };
    const newPos = new window.kakao.maps.LatLng(lat, lng);

    // 경로 그리기
    const prevCoord = prevPosRef.current;
    if (prevCoord && drawingEnabled && mapRef.current) {
      const prevPos = new window.kakao.maps.LatLng(prevCoord.lat, prevCoord.lng);
      const segmentDist = calculateDistance(prevCoord.lat, prevCoord.lng, lat, lng);

      if (segmentDist > 1) { // 1미터 이상 이동했을 때만 그리기
        totalDistanceRef.current += segmentDist;
        onDistanceChange?.(totalDistanceRef.current);

        coordinatesRef.current.push(newCoord);

        // 경로 업데이트 콜백 - 실제 이동했을 때만 호출
        onPathUpdate?.(newCoord);

        const polyline = new window.kakao.maps.Polyline({
          path: [prevPos, newPos],
          strokeWeight: 7,
          strokeColor: '#4FA65B',
          strokeOpacity: 0.9,
          strokeStyle: 'solid',
        });
        polyline.setMap(mapRef.current);

        prevPosRef.current = newCoord;
      }
    } else if (!prevCoord && drawingEnabled) {
      // 첫 위치 설정 (산책 시작 시)
      prevPosRef.current = newCoord;
      onPathUpdate?.(newCoord);
    }

    // 마커 위치 업데이트
    if (customOverlayRef.current) {
      customOverlayRef.current.setPosition(newPos);
    }
  }, [globalLocation, drawingEnabled, onPathUpdate, onDistanceChange, isLocationLoading]);

  // ✅ 마킹 버튼 누르면 현재 위치에 커스텀 마커 찍기
  useEffect(() => {
    if (markRequested && mapRef.current) {
      const { lat, lng } = currentPosRef.current;
      if (lat === 0 && lng === 0) return;

      const pos = new window.kakao.maps.LatLng(lat, lng);

      const iconHTML = renderToString(
        <MdWaterDrop
          style={{ width: '20px', height: '20px', color: '#4FA65B' }}
        />
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
        content: markerDiv.firstElementChild as HTMLElement,
        yAnchor: 1,
        zIndex: 5,
      });

      customOverlay.setMap(mapRef.current);
      mapRef.current.panTo(pos);
      onMarkHandled();
    }
  }, [markRequested]);

  useEffect(() => {
    /*const interval = setInterval(() => {
      const { lat, lng } = currentPosRef.current;
      if (lat && lng) {
        const payload = {
          walkId, // 꼭 전달받은 값이어야 함
          lat,
          lng,
          timestamp: new Date().toISOString(), // 또는 pos.timestamp 사용 가능
        };

        fetch(`/api/walks/${walkId}/coordinate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => console.error('좌표 전송 실패:', err));
      }
    }, 3000);

    return () => clearInterval(interval);*/
  }, [walkId]);

  useEffect(() => {
    if (moveToMyLocationRequested && mapRef.current) {
      const { lat, lng } = currentPosRef.current;
      if (lat !== 0 && lng !== 0) {
        const pos = new window.kakao.maps.LatLng(lat, lng);
        mapRef.current.panTo(pos); // ← 내 위치로 부드럽게 이동
        onMoveHandled?.();
      }
    }
  }, [moveToMyLocationRequested]);

  useImperativeHandle(ref, () => ({
    moveToMyLocation() {
      const { lat, lng } = currentPosRef.current;
      if (lat && lng && mapRef.current) {
        const pos = new window.kakao.maps.LatLng(lat, lng);
        mapRef.current.panTo(pos);
        console.log('📍 지도 중심 이동 완료');
      }
    },
    getCurrentPosition() {
      return currentPosRef.current;
    },
    updatePosition(lat: number, lng: number) {
      // 가상 위치 업데이트
      console.log('📍 가상 위치 업데이트 시작:', {
        새위치: { lat, lng },
        이전위치: prevPosRef.current,
        현재위치: currentPosRef.current
      });

      if (!mapRef.current || !window.kakao) {
        console.error('❌ 지도 또는 kakao 객체가 없습니다');
        return;
      }

      const newPos = new window.kakao.maps.LatLng(lat, lng);

      // 현재 위치 업데이트
      currentPosRef.current = { lat, lng };

      // 마커 이동
      if (customOverlayRef.current) {
        customOverlayRef.current.setPosition(newPos);
        console.log('✅ 마커 이동 완료');
      } else {
        console.log('⚠️ 마커가 없습니다');
      }

      // 지도 중심 이동
      mapRef.current.panTo(newPos);
      console.log('✅ 지도 중심 이동 완료');

      // 경로 그리기 (이전 위치가 있을 때만)
      if (prevPosRef.current && prevPosRef.current.lat !== 0 && drawingEnabled) {
        const prevPos = new window.kakao.maps.LatLng(prevPosRef.current.lat, prevPosRef.current.lng);
        const segmentDist = calculateDistance(prevPosRef.current.lat, prevPosRef.current.lng, lat, lng);

        console.log('📏 거리 계산:', {
          이전: prevPosRef.current,
          현재: { lat, lng },
          거리: segmentDist.toFixed(2) + 'm'
        });

        if (segmentDist > 0.5) { // 0.5미터 이상 이동했을 때 그리기 (테스트용으로 낮춤)
          totalDistanceRef.current += segmentDist;
          onDistanceChange?.(totalDistanceRef.current);

          coordinatesRef.current.push({ lat, lng });

          // 경로 업데이트 콜백
          onPathUpdate?.({ lat, lng });

          const polyline = new window.kakao.maps.Polyline({
            path: [prevPos, newPos],
            strokeWeight: 5,
            strokeColor: '#FF0000', // 테스트용으로 빨간색
            strokeOpacity: 1,
            strokeStyle: 'solid'
          });

          polyline.setMap(mapRef.current);
          console.log('✅ 경로 그리기 완료');
        } else {
          console.log('⚠️ 거리가 너무 짧아 경로를 그리지 않음');
        }
      } else {
        console.log('⚠️ 이전 위치가 없거나 그리기가 비활성화됨:', {
          prevPosRef: prevPosRef.current,
          drawingEnabled
        });
      }

      // 이전 위치 업데이트
      prevPosRef.current = { lat, lng };
      console.log('✅ 이전 위치 업데이트 완료');
    },
    captureMap,
    showFullPath,
    getStaticMapUrl,
    getMap: () => mapRef.current
  }));

  return (
    <div className="relative w-screen h-screen">
      <div ref={mapContainerRef} id="map" className="w-full h-full z-10" />

      {/* 로딩 인디케이터 */}
      {isLocationLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 z-20">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700">현재 위치 확인 중...</span>
        </div>
      )}

      {/* ✅ 지도 위에 올라가지만 마우스는 통과시키고, 버튼만 클릭 가능 */}
      <div ref={childrenWrapperRef} className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
});

export default KakaoMap;
