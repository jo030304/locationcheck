import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KakaoMap from './KakaoMap';
import Record from './Record';
import Operator from './Operator';
import StopButton from './StopButton';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  walkDistanceMetersState,
  walkRecordIdState,
  walkStartedAtState,
  walkMarkingCountState,
  walkPathCoordinatesState,
} from '../hooks/walkAtoms';
import {
  endWalk,
  saveTailcopterScore,
  updateWalkTrack,
  startWalk,
} from '../services/walks';
import { createPresignedUrl, uploadToS3 } from '../services/upload';
import { createMarkingPhoto } from '../services/marking';
import { getCourseRecommendations, getCourseDetails } from '../services/courses';

const Walk_existing = () => {
  const navigate = useNavigate();
  const [markRequested, setMarkRequested] = useState(false);
  const [distance, setDistance] = useRecoilState(walkDistanceMetersState);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [walkRecordId, setWalkRecordId] = useRecoilState(walkRecordIdState);
  const [startedAt, setStartedAt] = useRecoilState(walkStartedAtState);
  const pathRef = useRef<number[][]>([]);
  const mapRef = useRef<any>(null);
  const [markingCount, setMarkingCount] = useRecoilState(walkMarkingCountState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pathCoordinates, setPathCoordinates] = useRecoilState(
    walkPathCoordinatesState
  );
  
  // 코스 선택 관련 상태
  const [showCourseSelection, setShowCourseSelection] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 사용자 위치 가져오기 및 추천 코스 로드
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          
          // 추천 코스 로드
          try {
            setLoading(true);
            const response = await getCourseRecommendations({
              latitude: lat,
              longitude: lng,
              radius: 2000,
              sortBy: 'tailcopterScoreDesc',
              page: 1,
              size: 10,
            });
            setCourses((response as any)?.data?.courses || []);
          } catch (error) {
            console.error('Failed to load courses:', error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Failed to get location:', error);
          setLoading(false);
        }
      );
    }
  }, []);

  // 코스 선택 및 산책 시작
  const handleCourseSelect = async (course: any) => {
    try {
      setLoading(true);
      
      // 코스 상세 정보 가져오기
      const courseDetails = await getCourseDetails(course.course_id);
      setSelectedCourse(courseDetails);
      
      // 산책 시작
      const res = await startWalk({
        walk_type: 'EXISTING_COURSE',
        course_id: course.course_id,
      });
      
      const data = (res as any)?.data ?? res;
      const walkId = data?.walk_record_id || data?.data?.walk_record_id;
      
      if (walkId) {
        setWalkRecordId(walkId);
        setStartedAt(Date.now());
        setDistance(0);
        setMarkingCount(0);
        setPathCoordinates([]);
        setShowCourseSelection(false);
      }
    } catch (error) {
      console.error('Failed to start walk:', error);
      alert('산책을 시작할 수 없습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 주기적으로 서버에 경로 업데이트
  useEffect(() => {
    if (!showCourseSelection && walkRecordId) {
      const iv = setInterval(() => {
        if (pathRef.current.length === 0) return;
        const durationSec = startedAt
          ? Math.floor((Date.now() - startedAt) / 1000)
          : Math.floor(distance / 1);
        updateWalkTrack(walkRecordId, {
          currentPathCoordinates: pathRef.current,
          currentDistanceMeters: Math.floor(distance),
          currentDurationSeconds: durationSec,
        }).catch(() => {});
      }, 4000);
      return () => clearInterval(iv);
    }
  }, [walkRecordId, startedAt, distance, showCourseSelection]);

  // 산책 종료 처리
  const handleEndWalk = async () => {
    if (!walkRecordId) return;
    
    try {
      const durationSec = startedAt 
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;
      
      await endWalk(walkRecordId, {
        finalDurationSeconds: durationSec,
        finalDistanceMeters: Math.floor(distance),
        finalPathCoordinates: pathRef.current,
      });
      
      navigate('/koricopter');
    } catch (error) {
      console.error('Failed to end walk:', error);
    }
  };

  // 코스 선택 화면
  if (showCourseSelection) {
    return (
      <div className="w-full h-screen bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white shadow-sm px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/homepage')}
              className="text-gray-600"
            >
              ← 뒤로
            </button>
            <h1 className="text-lg font-semibold">기존 코스 선택</h1>
            <div className="w-8"></div>
          </div>
        </div>

        {/* 코스 목록 */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">코스를 불러오는 중...</div>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="text-gray-500 mb-4">주변에 추천 코스가 없습니다</div>
              <button
                onClick={() => navigate('/homepage')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg"
              >
                돌아가기
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm text-gray-600 mb-2">우리 동네 추천 코스</h2>
              {courses.map((course) => (
                <div
                  key={course.course_id}
                  onClick={() => handleCourseSelect(course)}
                  className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{course.course_name}</h3>
                    <span className="text-sm text-green-600">
                      꼬리점수 {course.average_tailcopter_score || 0}점
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>거리: {(course.course_length_meters / 1000).toFixed(1)}km</span>
                    <span>난이도: {course.difficulty}</span>
                    <span>추천 크기: {course.recommended_pet_size}</span>
                  </div>
                  {course.selected_features && course.selected_features.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {course.selected_features.map((feature: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 산책 화면
  return (
    <div>
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={async () => {
          setMarkRequested(false);
          fileInputRef.current?.click();
        }}
        drawingEnabled={true}
        onDistanceChange={(d) => setDistance(d)}
        walkId={walkRecordId || undefined}
        onPathUpdate={(c) => {
          pathRef.current.push([c.lat, c.lng]);
          setPathCoordinates((prev) => [...prev, [c.lat, c.lng]]);
        }}
        ref={mapRef}
      >
        <Record distance={distance} />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator onMark={() => setMarkRequested(true)} />
        </div>
        
        {/* 선택된 코스 정보 표시 */}
        {selectedCourse && (
          <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-md p-3">
            <h3 className="font-semibold">{selectedCourse.data?.course_name || selectedCourse.course_name}</h3>
            <p className="text-sm text-gray-600">
              목표 거리: {((selectedCourse.data?.course_length_meters || selectedCourse.course_length_meters || 0) / 1000).toFixed(1)}km
            </p>
          </div>
        )}
      </KakaoMap>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const pos = mapRef.current?.getCurrentPosition?.();
            const lat = pos?.lat;
            const lng = pos?.lng;
            if (!walkRecordId || lat == null || lng == null) return;

            const pre = await createPresignedUrl({
              fileName: file.name,
              fileType: (file.type as any) || 'image/jpeg',
              uploadType: 'marking',
            });
            const d = (pre as any)?.data ?? pre;
            const uploadUrl = d?.data?.uploadUrl || d?.uploadUrl;
            const fileUrl = d?.data?.fileUrl || d?.fileUrl;
            if (uploadUrl) await uploadToS3(uploadUrl, file);
            if (fileUrl) {
              await createMarkingPhoto({
                walkRecordId,
                latitude: lat,
                longitude: lng,
                photoUrl: fileUrl,
              });
              setMarkingCount((prev) => prev + 1);
            }
          } catch (error) {
            console.error('Failed to upload marking photo:', error);
          }
        }}
      />
      
      <StopButton
        disabled={buttonsDisabled}
        onClick={() => setShowStopModal(true)}
      />
      
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">산책을 종료하시겠습니까?</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleEndWalk}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg"
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Walk_existing;