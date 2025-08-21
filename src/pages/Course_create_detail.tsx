import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 추가
import { SlArrowLeft } from 'react-icons/sl';
import { useRecoilValue } from 'recoil';
import { walkRecordIdState, walkDistanceMetersState } from '../hooks/walkAtoms';
import { createPresignedUrl, uploadToS3 } from '../services/upload';
import {
  createCourse,
  getNewCourseBaseDetails,
  getCourseDetails,
  getCoursePhotozones,
} from '../services/courses';
import { getPhotozoneDetails } from '../services/marking';
const course_create_detail = () => {
  const navigate = useNavigate(); // 추가

  const [courseName, setCourseName] = useState('');
  const [courseFeature, setCourseFeature] = useState('');
  const [difficulty, setDifficulty] = useState<'상' | '중' | '하' | null>(null);
  const [dogSize, setDogSize] = useState<'소형' | '중형' | '대형' | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [fileObj, setFileObj] = useState<File | null>(null);
  const walkRecordId = useRecoilValue(walkRecordIdState);
  const walkDistanceMeters = useRecoilValue(walkDistanceMetersState);
  const [distanceText, setDistanceText] = useState('0.00KM');

  useEffect(() => {
    // Recoil state에서 직접 거리 사용
    if (walkDistanceMeters > 0) {
      setDistanceText(`${(walkDistanceMeters / 1000).toFixed(2)}KM`);
    }
  }, [walkDistanceMeters]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
      setFileObj(file);
    }
  };

  const handleSubmit = async () => {
    if (!courseName || !courseFeature || !difficulty || !dogSize) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    if (!walkRecordId) {
      console.error('walkRecordId가 없습니다!');
      alert('산책 기록 ID가 없습니다. 산책을 먼저 완료해주세요.');
      return;
    }

    try {
      let coverUrl: string | undefined = undefined;
      if (fileObj) {
        console.log('이미지 업로드 시작:', fileObj.name);
        const pre = await createPresignedUrl({
          fileName: fileObj.name,
          fileType: (fileObj.type as any) || 'image/jpeg',
          uploadType: 'course_cover',
        });
        const data = pre?.data ?? pre;
        const uploadUrl = data?.data?.uploadUrl || data?.uploadUrl;
        const fileUrl = data?.data?.fileUrl || data?.fileUrl;

        console.log('Presigned URL 받음:', { uploadUrl, fileUrl });

        if (uploadUrl && fileObj) {
          await uploadToS3(uploadUrl, fileObj);
          coverUrl = fileUrl;
          console.log('S3 업로드 완료, coverUrl:', coverUrl);
        }
      }

      const toSize = (s: string | null) => {
        if (s === '소형') return 'SMALL';
        if (s === '중형') return 'MEDIUM';
        if (s === '대형') return 'LARGE';
        return 'MEDIUM';
      };

      const coursePayload = {
        walkRecordId: walkRecordId,
        courseName,
        difficulty: difficulty!,
        recommendedPetSize: toSize(dogSize),
        selectedFeatures: courseFeature
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
        coverImageUrl: coverUrl,
      };

      console.log('코스 생성 요청:', coursePayload);

      const response = await createCourse(coursePayload);
      console.log('코스 생성 성공:', response);
      // 생성 후 코스에 연동된 포토존이 있는지 검증 로그 (조회)
      try {
        const respData: any = (response as any)?.data ?? response;
        const courseId = respData?.data?.courseId || respData?.courseId;
        console.info('[Course_create] created courseId', courseId);
        if (courseId) {
          try {
            const detail = await getCourseDetails(courseId);
            const d: any = (detail as any)?.data ?? detail;
            const course = d?.data ?? d;
            const mps = course?.markingPhotozones ?? [];
            console.info('[Course_create] course details after create', {
              markingPhotozonesCount: Array.isArray(mps) ? mps.length : 0,
              sample: Array.isArray(mps) && mps.length ? mps[0] : null,
            });
          } catch (e) {
            console.warn('[Course_create] getCourseDetails failed', e);
          }
          try {
            const pz = await getCoursePhotozones(courseId);
            const pzd: any = (pz as any)?.data ?? pz;
            const list =
              pzd?.data?.photozones || pzd?.photozones || pzd?.data || [];
            console.info('[Course_create] getCoursePhotozones', {
              count: Array.isArray(list) ? list.length : 0,
              sample: Array.isArray(list) && list.length ? list[0] : null,
            });
          } catch (e) {
            console.warn('[Course_create] getCoursePhotozones failed', e);
          }
        }
      } catch {}

      navigate('/walk_record_after_walk');
    } catch (e: any) {
      console.error('코스 생성 실패:', e);
      console.error('에러 상세:', e.response?.data || e.message);
      alert(
        `코스 생성에 실패했습니다: ${e.response?.data?.message || e.message || '알 수 없는 오류'}`
      );
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="relative mb-6 flex items-center justify-center">
        {/* 뒤로가기 버튼 (왼쪽) */}
        <SlArrowLeft
          onClick={() => navigate(-1)}
          className="absolute left-0 text-2xl text-[#ADADAD] cursor-pointer"
        />

        {/* 중앙 타이틀 */}
        <h1 className="font-pretendard text-[19px] font-medium text-center text-[#232323]">
          코스 등록하기
        </h1>
      </div>

      {/* 커버 이미지 */}
      <div className="mb-4">
        <label className="font-pretendard text-base font-medium text-[#232323]">
          커버 이미지
        </label>

        {coverImage ? (
          <img
            src={coverImage}
            alt="커버 이미지"
            className="rounded-xl w-full border border-[#CCCCCC] h-[300px] object-contain"
          />
        ) : (
          <label className="flex items-center justify-center border border-[#CCCCCC] rounded-xl w-full h-[300px] bg-gray-100 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <span className="text-gray-500 text-2xl">📷</span>
          </label>
        )}
      </div>
      {/* 거리 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스 거리</label>
        <input
          type="text"
          value={distanceText}
          readOnly
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 코스명 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스명</label>
        <input
          type="text"
          placeholder="코스명을 입력해주세요. (최대 10자)"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value.slice(0, 10))}
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 코스 특징 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">코스 특징</label>
        <input
          type="text"
          placeholder="코스 특징을 입력해주세요. (최대 3개)"
          value={courseFeature}
          onChange={(e) => setCourseFeature(e.target.value)}
          className="w-full p-2 border border-[#CCCCCC] rounded-md mt-1"
        />
      </div>
      {/* 난이도 선택 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">난이도</label>
        <div className="flex gap-2 mt-2">
          {['상', '중', '하'].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level as '상' | '중' | '하')}
              className={`flex-1 p-2 rounded-md border transition
        ${
          difficulty === level
            ? 'bg-[#E0F2D9] border-[#498952] text-[#498952]'
            : 'border-[#CCCCCC] text-[#232323] cursor-pointer'
        }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
      {/* 추천 견종 */}
      <div className="mb-4">
        <label className="text-sm text-gray-700">추천 견종</label>
        <div className="flex gap-2 mt-2">
          {[
            { label: '소형', range: '1~10kg' },
            { label: '중형', range: '10~25kg' },
            { label: '대형', range: '25kg 이상' },
          ].map((dog) => (
            <button
              key={dog.label}
              onClick={() => setDogSize(dog.label as '소형' | '중형' | '대형')}
              className={`flex-1 p-2 rounded-md border text-sm transition
        ${
          dogSize === dog.label
            ? 'bg-[#E0F2D9] border-[#498952] text-[#498952]'
            : 'border-[#CCCCCC] text-[#232323] cursor-pointer'
        }`}
            >
              {dog.label}
              <br />({dog.range})
            </button>
          ))}
        </div>
      </div>
      {/* 등록 버튼 */}
      <button
        onClick={handleSubmit}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-white transition cursor-pointer"
        style={{ backgroundColor: '#4fa65b' }}
      >
        등록하기
      </button>
    </div>
  );
};

export default course_create_detail;
