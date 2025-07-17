import { useLocation, useNavigate } from 'react-router-dom';

const CourseDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const course = location.state?.course;

  const information = [
    { key: 'distance', label: '거리' },
    { key: 'difficulty', label: '난이도' },
    { key: 'recommend', label: '추천 견종' },
    { key: 'tags', label: '코스 특징' },

  ];

  return (
    <div className="w-full min-h-screen bg-[#EBFFEB] flex justify-center">
      <div className="w-full max-w-[430px] bg-white text-gray-800 text-xl">
        <div className="w-full bg-gray-200 h-70 relative flex justify-center items-center">
          <button className="absolute top-3 left-3 px-3 py-1 rounded text-3xl cursor-pointer"
            onClick={() => navigate(-1)}>
            {'<'}
          </button>
          <div className="text-center text-blue-500 text-[23px]" style={{ color: '#3B82F6' }}>
            썸네일 이미지 <br />
            + <br />
            경로 이미지
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => navigate('/my_profile')}
            className="w-10 h-10 mt-3 ml-5 rounded-full bg-gray-300 cursor-pointer"

          />
          <div className="ml-3 mt-3 text-[18px]">
            {course?.dog}
          </div>
        </div>
        <div className="w-full h-0.5 bg-gray-100 mt-3" />
        <div className='mt-5'>
          <div className="font-bold text-[30px] flex gap-5 ml-15">
            <div>{course?.name}</div>
            <div>📍{course?.score}</div>
          </div>
        </div>
        <div className="mt-10 ml-15">
          <div className="mt-10 space-y-3 text-[20px]">
            {information.map((info) => (
              <div key={info.key}>
                <strong>{info.label}:</strong>{' '}
                {course?.[info.key] ?? '정보 없음'}
              </div>
            ))}
          </div>
        </div>
        <button className="font-bold border-3 border-black px-4 py-7 cursor-pointer mt-10 w-70 h-12 flex justify-center items-center rounded-2xl mx-auto block"
          onClick={() => navigate('/walk_countdown', { state: { from: 'exist' } })}>
          산책 시작
        </button>
    </div>
    </div >
  );
};

export default CourseDetailPage;
