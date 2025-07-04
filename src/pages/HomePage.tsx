import { useNavigate } from 'react-router-dom';
import KakaoMap from './KakaoMap';

const HomePage = () => {
  const navigate = useNavigate();

  const courseList = [
    {
      name: '오솔길 코스',
      score: 92,
      distance: '2.4KM',
      dog: '리뉴 (말티즈 7살)',
      tags: ['#잔잔', '#빠른산책'],
    },
    {
      name: '노을 코스',
      score: 88,
      distance: '3.1KM',
      dog: '코코 (치와와 3살)',
      tags: ['#감성', '#퇴근길', '#풍경'],
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#EBFFEB] flex justify-center">
      <div className="w-full max-w-[430px] h-screen bg-white px-6 py-10 text-gray-800 text-xl">
        <KakaoMap />
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span
              className="text-3xl cursor-pointer"
              onClick={() => navigate('/location_permission')}
            >
              📍
            </span>
            <span className="font-bold text-2xl">전주시 덕진구</span>
          </div>
          <button
            onClick={() => navigate('/my_profile')}
            className="w-12 h-12 rounded-full bg-gray-300 cursor-pointer"
          />
        </div>

        <div className="bg-gray-200 h-64 rounded-2xl mb-6 flex justify-center items-center">
          <span className="text-gray-500 text-2xl">강아지 이미지</span>
        </div>

        <div className="flex flex-row gap-4 mb-8">
          <button
            className="flex-1 py-4 border-2 border-gray-500 rounded-xl font-semibold cursor-pointer"
            onClick={() => navigate('/walk_history_list')}
          >
            산책일지 보기
          </button>
          <button
            className="flex-1 py-4 border-2 border-gray-500 rounded-xl font-semibold cursor-pointer"
            onClick={() => navigate('/walk_countdown', {state: {from: 'main'}})}
          >
            🐾 산책 시작하기
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-4">우리 동네 추천코스</h2>
        <div className="space-y-6">
          {courseList.map((course, idx) => (
            <div
              key={idx}
              className="flex justify-between items-start border-b pb-4 gap-4"
            >
              <div className="flex-1">
                <div className="font-bold text-xl mb-1 hover:underline cursor-pointer"
                 onClick={() => navigate(`/course_selected_detail`, {state: {course: course}})}>
                  {course.name} 📍{course.score}
                </div>
                <div className="text-lg text-gray-600 mb-1">
                  {course.distance} | {course.dog}
                </div>
                <div className="text-lg text-gray-500">
                  {course.tags.map((tag) => (
                    <span key={tag} className="mr-2">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="w-24 h-24 bg-gray-200 text-base flex items-center justify-center text-gray-600 rounded-lg">
                썸네일
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
