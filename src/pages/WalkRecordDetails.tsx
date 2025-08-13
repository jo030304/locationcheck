import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { startWalk, getWalkDiaryDetails } from '../services/walks';

export default function WalkRecordDetails() {
  const { walkRecordId } = useParams();
  const location = useLocation();
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dogName = useRecoilValue(nameState);

  useEffect(() => {
    const loadDetails = async () => {
      // location.state에서 전달받은 데이터가 있으면 사용
      if (location.state?.record) {
        setDetails(location.state.record);
        return;
      }

      // state가 없으면 API에서 가져오기
      if (!walkRecordId) {
        // walkRecordId가 없으면 기본 데이터 설정
        setDetails({
          walk_record_id: walkRecordId,
          title: '산책 기록',
          path_image_url: null,
          markingPhotos: [],
          distance_meters: 0,
          marking_count: 0,
          tailcopter_score: 0,
          created_at: new Date().toISOString()
        });
        return;
      }

      setIsLoading(true);
      try {
        const response = await getWalkDiaryDetails(walkRecordId);
        const data = response?.data ?? response;
        setDetails(data);
      } catch (error) {
        console.error('산책 기록 상세 정보 조회 실패:', error);
        // 에러 발생 시 기본 데이터 설정
        setDetails({
          walk_record_id: walkRecordId,
          title: '산책 기록',
          path_image_url: null,
          markingPhotos: [],
          distance_meters: 0,
          marking_count: 0,
          tailcopter_score: 0,
          created_at: new Date().toISOString()
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDetails();
  }, [walkRecordId, location.state]);

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}. ${month}. ${day} (${weekday})`;
  };

  // 거리 포맷팅
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)}km`;
    }
    return `${meters}m`;
  };

  if (isLoading || !details) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full max-w-[430px] mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-lg font-medium">
            {details.created_at ? formatDate(details.created_at) : '날짜 정보 없음'}
          </h1>
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-600"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4">
          {/* 강아지 정보와 제목 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xl">🐕</span>
            </div>
            <div className="text-base">
              <span className="font-medium">{dogName || '반려견'}</span>와 함께한{' '}
              <span className="font-medium">
                {details.course_name || details.courseName || '덕진공원'} 벚두리!
              </span>
            </div>
          </div>

          {/* 통계 정보 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">산책 거리</div>
              <div className="text-lg font-medium">
                {details.distance_meters 
                  ? formatDistance(details.distance_meters)
                  : details.distanceMeters 
                  ? formatDistance(details.distanceMeters)
                  : '0m'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">마킹 횟수</div>
              <div className="text-lg font-medium">
                {details.marking_count || details.markingCount || 0}회
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">꼬리 점수</div>
              <div className="text-lg font-medium">
                {details.tailcopter_score || details.tailcopterScore || 0}점
              </div>
            </div>
          </div>

          {/* 경로 이미지 */}
          <div className="w-full h-[650px] bg-gray-100 rounded-lg mb-6 overflow-hidden">
            {details.path_image_url || details.pathImageUrl ? (
              <img
                src={details.path_image_url || details.pathImageUrl}
                alt="산책 경로"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><div class="text-4xl mb-2">🗺️</div><div class="text-sm">경로 이미지 없음</div></div></div>';
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🗺️</div>
                  <div className="text-sm">경로 이미지 없음</div>
                </div>
              </div>
            )}
          </div>

          {/* 다시 산책하기 버튼 */}
          <button
            className="w-full bg-green-500 text-white font-medium py-4 rounded-full"
            onClick={async () => {
              if (details.course_id || details.courseId) {
                try {
                  const res = await startWalk({
                    walk_type: 'EXISTING_COURSE',
                    course_id: details.course_id || details.courseId,
                  });
                  navigate('/walk_countdown', { state: { from: 'exist' } });
                } catch (e) {
                  alert('산책을 시작할 수 없습니다.');
                }
              } else {
                // 코스 ID가 없으면 새로운 산책으로 시작
                navigate('/walk_new');
              }
            }}
          >
            이 코스로 다시 산책하기
          </button>
        </div>
      </div>
    </div>
  );
}