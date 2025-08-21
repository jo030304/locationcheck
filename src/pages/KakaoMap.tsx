import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { MdWaterDrop } from 'react-icons/md';
import { renderToString } from 'react-dom/server';
import { useRecoilValue } from 'recoil';
import { currentLocationState, walkPausedState } from '../hooks/walkAtoms';
import { takeScreenshot } from '@xata.io/screenshot';

declare global {
  interface Window {
    kakao: any;
  }
}

type BasePathOptions = {
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  strokeStyle?:
    | 'solid'
    | 'shortdash'
    | 'shortdot'
    | 'dash'
    | 'dot'
    | 'longdash';
};

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

  /** 회색으로 미리 칠할 전체 코스 좌표( [lat, lng] 배열 ) */
  basePath?: Array<[number, number]>;
  basePathOptions?: BasePathOptions;

  /** 실시간 이동 경로 폴리라인(초록) 그리기 여부 (기본값: true) */
  drawRealtimePolyline?: boolean;

  /** 회색 코스 대비 진행도(초록, basePath 일부 칠하기) 표시 여부 (기본값: true) */
  enableProgressOnBasePath?: boolean;
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

    basePath,
    basePathOptions,
    drawRealtimePolyline = true,
    enableProgressOnBasePath = true,
  }: KakaoMapProps,
  ref
) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const childrenWrapperRef = useRef<HTMLDivElement>(null);

  const currentPosRef = useRef<{ lat: number; lng: number }>({
    lat: 0,
    lng: 0,
  });
  const coordinatesRef = useRef<{ lat: number; lng: number }[]>([]);
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const totalDistanceRef = useRef(0);
  const customOverlayRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);

  /** 회색 전체 코스 폴리라인 */
  const basePolylineRef = useRef<any>(null);
  /** 완료(초록) 코스 폴리라인 */
  const progressPolylineRef = useRef<any>(null);
  /** basePath에서 현재까지 ‘완료’된 가장 먼 인덱스 */
  const progressIndexRef = useRef<number>(-1);
  /** basePath 최신값 보관 */
  const basePathRef = useRef<Array<[number, number]>>([]);

  /** basePath Bounds fit은 최초 1회만 */
  const didFitBaseBoundsRef = useRef(false);
  /** 마지막 basePathOptions 저장 */
  const basePathOptionsRef = useRef<BasePathOptions | undefined>(undefined);

  const initialPosRef = useRef(initialPosition);
  const [mapInitialized, setMapInitialized] = useState(false);
  const globalLocation = useRecoilValue(currentLocationState);
  const paused = useRecoilValue(walkPausedState);

  const [isLocationLoading, setIsLocationLoading] = useState(
    !initialPosition && !globalLocation
  );

  /** Haversine 거리(m) */
  function haversine(
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
    return R * c;
  }

  /** 얕은 경로 비교 */
  function shallowEqualPath(
    a?: Array<[number, number]>,
    b?: Array<[number, number]>
  ) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
    }
    return true;
  }

  /** 옵션 비교(기본값 포함) */
  function shallowEqualOptions(a?: BasePathOptions, b?: BasePathOptions) {
    const da = {
      strokeColor: a?.strokeColor ?? '#CCCCCC',
      strokeWeight: a?.strokeWeight ?? 6,
      strokeOpacity: a?.strokeOpacity ?? 1,
      strokeStyle: a?.strokeStyle ?? 'solid',
    };
    const db = {
      strokeColor: b?.strokeColor ?? '#CCCCCC',
      strokeWeight: b?.strokeWeight ?? 6,
      strokeOpacity: b?.strokeOpacity ?? 1,
      strokeStyle: b?.strokeStyle ?? 'solid',
    };
    return (
      da.strokeColor === db.strokeColor &&
      da.strokeWeight === db.strokeWeight &&
      da.strokeOpacity === db.strokeOpacity &&
      da.strokeStyle === db.strokeStyle
    );
  }

  /** 현재 위치를 basePath에 스냅해서 완료 구간을 업데이트 */
  const updateProgressForPosition = (lat: number, lng: number) => {
    const path = basePathRef.current;
    if (!mapRef.current || !window.kakao || !path || path.length < 2) return;

    // 가장 가까운 basePath 정점 찾기
    let nearestIdx = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < path.length; i++) {
      const [plat, plng] = path[i];
      const d = haversine(lat, lng, plat, plng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    // 너무 멀면(코스에서 이탈) 완료 반영 X
    const SNAP_THRESHOLD_M = 30; // 필요시 조정
    if (nearestIdx < 0 || nearestDist > SNAP_THRESHOLD_M) return;

    // 뒤로 가는 건 무시하고, 가장 멀리 간 인덱스로 갱신
    if (nearestIdx <= progressIndexRef.current) return;
    progressIndexRef.current = nearestIdx;

    // 0..nearestIdx까지를 초록 폴리라인으로 그림
    const donePathLatLng = path
      .slice(0, nearestIdx + 1)
      .map(([la, ln]) => new window.kakao.maps.LatLng(la, ln));

    if (!progressPolylineRef.current) {
      progressPolylineRef.current = new window.kakao.maps.Polyline({
        path: donePathLatLng,
        strokeColor: '#4FA65B',
        strokeWeight: 7,
        strokeOpacity: 0.95,
        strokeStyle: 'solid',
      });
    } else {
      progressPolylineRef.current.setPath(donePathLatLng);
    }
    progressPolylineRef.current.setMap(mapRef.current);
  };

  // ----- 지도 캡처 (기존 로직 유지) -----
  const captureMap = async (): Promise<string | null> => {
    if (!mapContainerRef.current || !mapRef.current) return null;
    try {
      if (coordinatesRef.current && coordinatesRef.current.length > 0) {
        showFullPath(coordinatesRef.current);
        await new Promise((r) => setTimeout(r, 500));
      }
      try {
        const controls =
          mapContainerRef.current.querySelectorAll('[class*="control"]');
        controls.forEach((el: any) => (el.style.display = 'none'));
        if (childrenWrapperRef.current)
          childrenWrapperRef.current.style.display = 'none';
        await new Promise((r) => setTimeout(r, 100));
        const screenshot = await takeScreenshot();
        controls.forEach((el: any) => (el.style.display = ''));
        if (childrenWrapperRef.current)
          childrenWrapperRef.current.style.display = '';
        if (screenshot) return screenshot;
        throw new Error('스크린샷 변환 실패');
      } catch {
        const controls =
          mapContainerRef.current.querySelectorAll('[class*="control"]');
        controls.forEach((el: any) => (el.style.display = ''));
        if (childrenWrapperRef.current)
          childrenWrapperRef.current.style.display = '';
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!coordinatesRef.current.length)
          return canvas.toDataURL('image/png');
        const coords = coordinatesRef.current;
        const minLat = Math.min(...coords.map((c) => c.lat));
        const maxLat = Math.max(...coords.map((c) => c.lat));
        const minLng = Math.min(...coords.map((c) => c.lng));
        const maxLng = Math.max(...coords.map((c) => c.lng));
        const padding = 0.2;
        const latRange = maxLat - minLat || 0.001;
        const lngRange = maxLng - minLng || 0.001;
        const aspectRatio = canvas.width / canvas.height;
        const dataAspectRatio = lngRange / latRange;
        let adjustedLatRange = latRange;
        let adjustedLngRange = lngRange;
        if (dataAspectRatio > aspectRatio)
          adjustedLatRange = lngRange / aspectRatio;
        else adjustedLngRange = latRange * aspectRatio;
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const toCanvasX = (lng: number) =>
          ((lng - (centerLng - adjustedLngRange / 2)) / adjustedLngRange) *
            canvas.width *
            (1 - padding) +
          (canvas.width * padding) / 2;
        const toCanvasY = (lat: number) =>
          canvas.height -
          (((lat - (centerLat - adjustedLatRange / 2)) / adjustedLatRange) *
            canvas.height *
            (1 - padding) +
            (canvas.height * padding) / 2);
        ctx.strokeStyle = '#4FA65B';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        coords.forEach((coord, i) => {
          const x = toCanvasX(coord.lng);
          const y = toCanvasY(coord.lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        const startX = toCanvasX(coords[0].lng);
        const startY = toCanvasY(coords[0].lat);
        ctx.fillStyle = '#4FA65B';
        ctx.beginPath();
        ctx.arc(startX, startY, 6, 0, Math.PI * 2);
        ctx.fill();
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
    } catch (e) {
      console.error('경로 이미지 생성 실패:', e);
      return null;
    }
  };

  // ----- 현재(녹색) 경로 한 번에 보여주기 (유지) -----
  const showFullPath = (coordinates: { lat: number; lng: number }[]) => {
    if (!mapRef.current || !window.kakao || !coordinates.length) return;
    if (polylineRef.current) polylineRef.current.setMap(null);
    const path = coordinates.map(
      (c) => new window.kakao.maps.LatLng(c.lat, c.lng)
    );
    polylineRef.current = new window.kakao.maps.Polyline({
      path,
      strokeWeight: 5,
      strokeColor: '#4FA65B',
      strokeOpacity: 0.8,
      strokeStyle: 'solid',
    });
    polylineRef.current.setMap(mapRef.current);

    const bounds = new window.kakao.maps.LatLngBounds();
    coordinates.forEach((c) =>
      bounds.extend(new window.kakao.maps.LatLng(c.lat, c.lng))
    );
    mapRef.current.setBounds(bounds);
  };

  const getStaticMapUrl = (
    coordinates: { lat: number; lng: number }[]
  ): string | null => {
    if (!coordinates.length) return null;
    const centerLat =
      coordinates.reduce((s, c) => s + c.lat, 0) / coordinates.length;
    const centerLng =
      coordinates.reduce((s, c) => s + c.lng, 0) / coordinates.length;
    const polylineCoords = coordinates
      .slice(0, 100)
      .map((c) => `${c.lng},${c.lat}`)
      .join('|');
    const baseUrl = 'https://dapi.kakao.com/v2/maps/staticmap';
    const params = new URLSearchParams({
      center: `${centerLng},${centerLat}`,
      level: '5',
      size: '400x300',
      markers: '',
      polyline: `5|0xFF4FA65B|0.8|solid|${polylineCoords}`,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  // ----- 지도 초기화 (최초 1회) -----
  useEffect(() => {
    if (!window.kakao?.maps) return;
    if (mapRef.current) return; // 이미 초기화됨

    const container = mapContainerRef.current;
    if (!container) return;

    const pos = initialPosRef.current;
    let initialLat = 37.545354,
      initialLng = 126.952576,
      initialLevel = 13;
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

    if (pos) {
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="rgb(80,80,255)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.3s ease;">
        <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
      </svg>`;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(pos.lat, pos.lng),
        content: markerContent,
        yAnchor: 1,
      });
      overlay.setMap(map);
      customOverlayRef.current = overlay;
    }

    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        mapRef.current &&
        currentPosRef.current.lat !== 0
      ) {
        mapRef.current.panTo(
          new window.kakao.maps.LatLng(
            currentPosRef.current.lat,
            currentPosRef.current.lng
          )
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setMapInitialized(true);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 지도 초기화 직후, 이미 전역 위치가 있다면 즉시 현재 위치로 이동/표시
  useEffect(() => {
    if (testMode) return;
    if (!mapInitialized || !mapRef.current || !globalLocation) return;
    const { lat, lng } = globalLocation;
    const cur = new window.kakao.maps.LatLng(lat, lng);
    currentPosRef.current = { lat, lng };
    if (!customOverlayRef.current) {
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <svg id="lucide-icon" xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="rgb(80,80,255)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(0deg); transition: transform 0.3s ease;">
          <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
        </svg>`;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: cur,
        content: markerContent,
        yAnchor: 1,
      });
      overlay.setMap(mapRef.current);
      customOverlayRef.current = overlay;
    } else {
      customOverlayRef.current.setPosition(cur);
    }
    mapRef.current.panTo(cur);
    mapRef.current.setLevel(5);
    if (isLocationLoading) setIsLocationLoading(false);
  }, [mapInitialized]);

  // ----- 회색 전체 코스 그리기 (변경 감지 기반, Bounds는 최초 1회) -----
  useEffect(() => {
    if (!mapRef.current || !window.kakao) return;

    // 경로가 없으면 정리만
    if (!basePath || basePath.length < 2) {
      basePathRef.current = [];
      if (basePolylineRef.current) {
        basePolylineRef.current.setMap(null);
        basePolylineRef.current = null;
      }
      if (progressPolylineRef.current) {
        progressPolylineRef.current.setMap(null);
        progressPolylineRef.current = null;
      }
      progressIndexRef.current = -1;
      didFitBaseBoundsRef.current = false; // 다음에 경로가 들어오면 1회 fit
      basePathOptionsRef.current = basePathOptions;
      return;
    }

    // 변경 감지
    const pathChanged = !shallowEqualPath(basePathRef.current, basePath);
    const optsChanged = !shallowEqualOptions(
      basePathOptionsRef.current,
      basePathOptions
    );

    // 1) 경로가 실제로 바뀐 경우에만 path 업데이트 (리셋 최소화)
    if (pathChanged) {
      basePathRef.current = basePath;
      progressIndexRef.current = -1;

      const pathLL = basePath.map(
        ([lat, lng]) => new window.kakao.maps.LatLng(lat, lng)
      );
      const strokeColor = basePathOptions?.strokeColor ?? '#CCCCCC';
      const strokeWeight = basePathOptions?.strokeWeight ?? 6;
      const strokeOpacity = basePathOptions?.strokeOpacity ?? 1;
      const strokeStyle = basePathOptions?.strokeStyle ?? 'solid';

      if (!basePolylineRef.current) {
        basePolylineRef.current = new window.kakao.maps.Polyline({
          path: pathLL,
          strokeColor,
          strokeWeight,
          strokeOpacity,
          strokeStyle,
        });
        basePolylineRef.current.setMap(mapRef.current);
      } else {
        basePolylineRef.current.setPath(pathLL);
        basePolylineRef.current.setOptions({
          strokeColor,
          strokeWeight,
          strokeOpacity,
          strokeStyle,
        });
      }

      // 경로가 처음 들어온 경우에만 전체 보기로 Bounds fit
      if (!didFitBaseBoundsRef.current) {
        const bounds = new window.kakao.maps.LatLngBounds();
        pathLL.forEach((p) => bounds.extend(p));
        mapRef.current.setBounds(bounds);
        didFitBaseBoundsRef.current = true;
      }
    } else if (optsChanged && basePolylineRef.current) {
      // 2) 옵션만 바뀌면 스타일만 갱신 (경로/Bounds 유지)
      const strokeColor = basePathOptions?.strokeColor ?? '#CCCCCC';
      const strokeWeight = basePathOptions?.strokeWeight ?? 6;
      const strokeOpacity = basePathOptions?.strokeOpacity ?? 1;
      const strokeStyle = basePathOptions?.strokeStyle ?? 'solid';
      basePolylineRef.current.setOptions({
        strokeColor,
        strokeWeight,
        strokeOpacity,
        strokeStyle,
      });
    }

    basePathOptionsRef.current = basePathOptions;
  }, [basePath, basePathOptions]);

  // ----- 위치 업데이트(실제 이동) → 진행도 칠하기 -----
  useEffect(() => {
    if (testMode) return;
    if (!globalLocation || !mapRef.current) return;
    if (paused && !isLocationLoading) return;

    const { lat, lng } = globalLocation;
    currentPosRef.current = { lat, lng };
    const cur = new window.kakao.maps.LatLng(lat, lng);
    // 오버레이가 없다면 지금 생성하고 최초 1회 카메라 이동/레벨 설정
    if (!customOverlayRef.current) {
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
          <svg id="lucide-icon" xmlns="http://www.w3.org/2000/svg"
            width="25" height="25" viewBox="0 0 24 24" fill="none"
            stroke="rgb(80,80,255)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            style="transform: rotate(0deg); transition: transform 0.3s ease;">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>`;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: cur,
        content: markerContent,
        yAnchor: 1,
      });
      overlay.setMap(mapRef.current);
      customOverlayRef.current = overlay;
      mapRef.current.panTo(cur);
      mapRef.current.setLevel(5);
      if (isLocationLoading) setIsLocationLoading(false);
    } else if (isLocationLoading) {
      // 로딩 플래그만 남아있는 경우에도 1회 카메라 이동 처리
      setIsLocationLoading(false);
      mapRef.current.panTo(cur);
      mapRef.current.setLevel(5);
    }

    // 실시간 녹색 경로
    const prev = prevPosRef.current;
    const drawingActive = drawingEnabled && !paused;
    if (prev && drawingActive && mapRef.current) {
      const prevPos = new window.kakao.maps.LatLng(prev.lat, prev.lng);
      const newPos = new window.kakao.maps.LatLng(lat, lng);
      const segmentDist = haversine(prev.lat, prev.lng, lat, lng);
      if (segmentDist > 1) {
        totalDistanceRef.current += segmentDist;
        onDistanceChange?.(totalDistanceRef.current);
        coordinatesRef.current.push({ lat, lng });
        onPathUpdate?.({ lat, lng });
        if (drawRealtimePolyline) {
          const poly = new window.kakao.maps.Polyline({
            path: [prevPos, newPos],
            strokeWeight: 7,
            strokeColor: '#4FA65B',
            strokeOpacity: 0.9,
            strokeStyle: 'solid',
            zIndex: 4,
          });
          poly.setMap(mapRef.current);
        }
        prevPosRef.current = { lat, lng };
      }
    } else if (!prev && drawingActive) {
      prevPosRef.current = { lat, lng };
      onPathUpdate?.({ lat, lng });
    }

    // 👉 회색 코스 칠하기(진행도 업데이트)
    if (enableProgressOnBasePath) updateProgressForPosition(lat, lng);

    // 마커 이동
    if (customOverlayRef.current) {
      customOverlayRef.current.setPosition(
        new window.kakao.maps.LatLng(lat, lng)
      );
    }
  }, [
    globalLocation,
    drawingEnabled,
    onPathUpdate,
    onDistanceChange,
    isLocationLoading,
    paused,
    testMode,
  ]);

  // ----- 가상 이동 시에도 진행도 반영 -----
  useImperativeHandle(ref, () => ({
    moveToMyLocation() {
      const { lat, lng } = currentPosRef.current;
      if (lat && lng && mapRef.current) {
        const pos = new window.kakao.maps.LatLng(lat, lng);
        mapRef.current.panTo(pos);
      }
    },
    getCurrentPosition() {
      return currentPosRef.current;
    },
    updatePosition(lat: number, lng: number) {
      if (!mapRef.current || !window.kakao) return;
      const newPos = new window.kakao.maps.LatLng(lat, lng);
      currentPosRef.current = { lat, lng };
      if (customOverlayRef.current)
        customOverlayRef.current.setPosition(newPos);
      mapRef.current.panTo(newPos);

      const prev = prevPosRef.current;
      if (prev && prev.lat !== 0 && drawingEnabled) {
        const prevPos = new window.kakao.maps.LatLng(prev.lat, prev.lng);
        const segmentDist = haversine(prev.lat, prev.lng, lat, lng);
        if (segmentDist > 0.5) {
          totalDistanceRef.current += segmentDist;
          onDistanceChange?.(totalDistanceRef.current);
          coordinatesRef.current.push({ lat, lng });
          onPathUpdate?.({ lat, lng });
          if (drawRealtimePolyline) {
            const poly = new window.kakao.maps.Polyline({
              path: [prevPos, newPos],
              strokeWeight: 5,
              strokeColor: '#4FA65B',
              strokeOpacity: 1,
              strokeStyle: 'solid',
            });
            poly.setMap(mapRef.current);
          }
        }
      }
      prevPosRef.current = { lat, lng };

      // 👉 가상 이동에도 진행도 업데이트
      if (enableProgressOnBasePath) updateProgressForPosition(lat, lng);
    },
    captureMap,
    showFullPath,
    getStaticMapUrl,
    getMap: () => mapRef.current,
  }));

  // ----- 마킹 -----
  useEffect(() => {
    if (!markRequested || !mapRef.current) return;
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
    const overlay = new window.kakao.maps.CustomOverlay({
      position: pos,
      content: markerDiv.firstElementChild as HTMLElement,
      yAnchor: 1,
      zIndex: 5,
    });
    overlay.setMap(mapRef.current);
    mapRef.current.panTo(pos);
    onMarkHandled();
  }, [markRequested, onMarkHandled]);

  // ----- "내 위치로" 이동 -----
  useEffect(() => {
    if (!moveToMyLocationRequested || !mapRef.current) return;
    const { lat, lng } = currentPosRef.current;
    if (lat === 0 || lng === 0) return;
    const pos = new window.kakao.maps.LatLng(lat, lng);
    mapRef.current.panTo(pos);
    onMoveHandled?.();
  }, [moveToMyLocationRequested, onMoveHandled]);

  return (
    <div className="relative w-screen h-screen">
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      {isLocationLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 z-20">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-700">현재 위치 확인 중...</span>
        </div>
      )}
      <div
        ref={childrenWrapperRef}
        className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
      >
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
});

export default KakaoMap;
