/* CourseDetailPage.tsx */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCoursePhotozones } from '../services/courses';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { walkRecordIdState, walkStartedAtState } from '../hooks/walkAtoms';
import { startWalk } from '../services/walks';
import { nameState, breedState, birthState } from '../hooks/animalInfoAtoms';
import { FaChevronLeft } from 'react-icons/fa6';
import Profile from '../hooks/Profile';

type ProfileButtonProps = {
  to?: string;
  imgSrc?: string;
  alt?: string;
  baseSize?: number; // 기준 지름(px)
  basePadding?: number; // 기준 패딩(px)
  scale?: number; // 전체 스케일 (예: 1.25면 25% 확대)
};

function ProfileButton({
  to = '/my_profile',
  imgSrc = '/기본 마이 프로필.png',
  alt = '기본 마이 프로필',
  baseSize = 28,
  basePadding = 6,
  scale = 1,
}: ProfileButtonProps) {
  const navigate = useNavigate();
  const size = baseSize * scale;
  const padding = basePadding * scale;

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="rounded-full bg-gray-200 overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, padding }}
      aria-label="내 프로필로 이동"
      title="내 프로필"
    >
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
      />
    </button>
  );
}

const StartButtonUI: React.FC<{
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
}> = ({ onClick, className = '', disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-[#4FA65B] text-white py-3 rounded-xl shadow-lg cursor-pointer
                ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:opacity-90'}
                w-full ${className}`}
  >
    산책 시작하기
  </button>
);

const CourseDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(location.state?.course || null);
  const courseId =
    location.state?.courseId ||
    location.state?.course?.courseId ||
    location.state?.course?.id ||
    location.state?.course?.course_id;

  const [starting, setStarting] = useState(false);
  const setWalkRecordId = useSetRecoilState(walkRecordIdState);
  const setWalkStartedAt = useSetRecoilState(walkStartedAtState);

  const dogName = useRecoilValue(nameState);
  const dogBreed = useRecoilValue(breedState);
  const dogBirth = useRecoilValue(birthState);
  const dogAge = (() => {
    if (!dogBirth) return null;
    const b = new Date(dogBirth);
    const t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const mdiff = t.getMonth() - b.getMonth();
    if (mdiff < 0 || (mdiff === 0 && t.getDate() < b.getDate())) age--;
    return Math.max(age, 0);
  })();

  const [photozones, setPhotozones] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        if (courseId) {
          const pz = await getCoursePhotozones(courseId);
          const pd = (pz as any)?.data ?? pz;
          setPhotozones(pd?.data?.photozones || pd?.photozones || []);
        }
      } catch {}
    })();
  }, [courseId, course]);

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  };

  const formatDifficulty = (difficulty: string) => {
    const map: any = { HARD: '상', NORMAL: '중', MEDIUM: '중', EASY: '하' };
    return map[difficulty] || difficulty;
  };

  const formatPetSize = (size: string) => {
    const map: any = { SMALL: '소형견', MEDIUM: '중형견', LARGE: '대형견' };
    return map[size] || size;
  };

  const images: string[] = [];
  if (course?.coverImageUrl) images.push(course.coverImageUrl);
  if (course?.coursePhotoUrl) images.push(course.coursePhotoUrl);
  if (course?.photoUrl) images.push(course.photoUrl);
  if (course?.pathImageUrl) images.push(course.pathImageUrl);

  const handleStartExistingCourse = async () => {
    if (!courseId) {
      alert('코스 정보가 없습니다. 다시 선택해주세요.');
      navigate(-1);
      return;
    }
    try {
      setStarting(true);
      const res = await startWalk({
        walk_type: 'EXISTING_COURSE',
        course_id: courseId,
      });
      const data: any = (res as any)?.data ?? res;
      const u = data?.data ?? data;
      const id =
        u?.walk_record_id ??
        u?.walkRecordId ??
        u?.data?.walk_record_id ??
        u?.data?.walkRecordId ??
        null;
      if (!id) throw new Error('walkRecordId missing');
      setWalkRecordId(id);
      try {
        sessionStorage.setItem('active_walk_record_id', String(id));
      } catch {}
      setWalkStartedAt(Date.now());
      navigate('/walk_countdown?state=existing', {
        state: { startType: 'existing', from: 'exist', courseId },
      });
    } catch (e) {
      console.error('산책 시작 실패:', e);
      alert('산책을 시작할 수 없습니다.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEFFFA]">
      <div className="w-full max-w-[430px] mx-auto">
        {/* 1) 상단 헤더 */}
        <div className="relative flex items-center p-5 border-b border-gray-200 bg-white">
          <FaChevronLeft
            className="text-gray-600 cursor-pointer"
            onClick={() => navigate(-1)}
          />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-800">
            코스 상세정보
          </h1>
        </div>

        {/* 2) 이미지 */}
        <div className="relative w-full h-64 bg-gray-100">
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]}
                alt="코스 이미지"
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              이미지 없음
            </div>
          )}
        </div>

        {/* 3) 이미지 아래 강아지 정보 */}
        <div className="flex items-center px-5 py-3 bg-white">
          <Profile className scale={1.5} basePadding={2} />
          <div className="ml-3 leading-tight">
            {/* 이름 */}
            <div className="text-sm font-semibold text-gray-900">
              {dogName || '반려견'}
            </div>
            {/* 견종, 나이 */}
            <div className="text-[12px] text-gray-500">
              {[dogBreed, dogAge !== null ? `${dogAge}살` : null]
                .filter(Boolean)
                .join(', ') || '정보 없음'}
            </div>
          </div>
        </div>

        {/* 4) 구분선 (스크린샷의 빨간 박스 위치) */}
        <div className="h-[1px] bg-gray-200 mx-5" />

        {/* 5) 코스 이름 & 점수 */}
        <div className="px-5 pb-4 pt-4 bg-white">
          <h1 className="text-xl font-bold flex justify-between items-center">
            {/* 왼쪽: 코스 이름 */}
            <span>
              {course?.courseName ||
                course?.name ||
                course?.course_name ||
                '코스 이름'}
            </span>

            {/* 오른쪽: 점수 */}
            {(course?.averageTailcopterScore ||
              course?.tailcopterScore ||
              course?.score) && (
              <span className="flex items-center gap-1 text-base font-normal text-gray-600">
                <span>🦴</span>
                <span>
                  {course?.averageTailcopterScore ||
                    course?.tailcopterScore ||
                    course?.score}
                </span>
              </span>
            )}
          </h1>
        </div>

        {/* 6) 코스 정보 */}
        <div className="px-5 space-y-4 pb-10 bg-white">
          <div className="space-y-2">
            <div className="flex items-center gap-12">
              <span className="text-sm text-gray-500 min-w-[80px]">거리</span>
              <span className="text-base font-medium">
                {course?.courseLengthMeters !== undefined &&
                course?.courseLengthMeters !== null
                  ? formatDistance(course.courseLengthMeters)
                  : '정보 없음'}
              </span>
            </div>
            <div className="flex items-center gap-12">
              <span className="text-sm text-gray-500 min-w-[80px]">난이도</span>
              <span className="text-base font-medium">
                {course?.difficulty
                  ? formatDifficulty(course.difficulty)
                  : '정보 없음'}
              </span>
            </div>
            <div className="flex items-center gap-12">
              <span className="text-sm text-gray-500 min-w-[80px]">
                추천 견종
              </span>
              <span className="text-base font-medium">
                {course?.recommendedPetSize
                  ? formatPetSize(course.recommendedPetSize)
                  : '정보 없음'}
              </span>
            </div>
            <div className="flex items-start gap-12">
              <span className="text-sm text-gray-500 min-w-[80px]">
                코스 특징
              </span>
              <div className="flex flex-wrap gap-2">
                {course?.features &&
                Array.isArray(course.features) &&
                course.features.length > 0 ? (
                  course.features.map((feature: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))
                ) : (
                  <span className="text-base font-medium">정보 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 7) 하단 버튼 영역 (고정 해제) */}
        <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="p-4 bg-transparent shadow-none border-0">
            {/* {photozones.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <StartButtonUI
                  onClick={handleStartExistingCourse}
                  disabled={starting}
                  className="w-full py-4"
                />
                <button
                  className="w-full border border-gray-300 text-gray-700 font-medium py-4 rounded-full hover:bg-gray-50 transition-colors bg-transparent"
                  onClick={() =>
                    navigate('/course_photozones', { state: { photozones } })
                  }
                >
                  포토존
                </button>
              </div>
            ) : ( */}
            <StartButtonUI
              onClick={handleStartExistingCourse}
              disabled={starting}
              className="w-full py-4"
            />
            {/* )} */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
