import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useResetRecoilState } from 'recoil';
import { nameState } from '../hooks/animalInfoAtoms';
import { getMyProfile, getMyWalkRecords } from '../services/users';
import { logout } from '../services/auth';

const MyPage = () => {
  const navigate = useNavigate();
  const petName = useRecoilValue(nameState);
  const [profileData, setProfileData] = useState<any>(null);
  const [walkRecords, setWalkRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'records'>('profile');

  // 프로필 및 산책 기록 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 프로필 정보 로드
        const profileRes = await getMyProfile();
        const profile = (profileRes as any)?.data ?? profileRes;
        setProfileData(profile);
        
        // 산책 기록 로드
        const recordsRes = await getMyWalkRecords({ page: 1, size: 5 });
        const records = (recordsRes as any)?.data?.records || [];
        setWalkRecords(records);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await logout();
        // 로컬 스토리지 토큰 삭제
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/');
      } catch (error) {
        console.error('Logout failed:', error);
        // 에러가 발생해도 로컬 토큰은 삭제하고 로그인 페이지로 이동
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        navigate('/');
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/homepage')}
              className="text-gray-600"
            >
              ← 뒤로
            </button>
            <h1 className="text-lg font-semibold">마이페이지</h1>
            <button
              onClick={handleLogout}
              className="text-red-500 text-sm"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 프로필 섹션 */}
      <div className="bg-white mt-2 p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
            {profileData?.petProfileImageUrl ? (
              <img
                src={profileData.petProfileImageUrl}
                alt="프로필"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <img
                src="/기본 프로필.png"
                alt="기본 프로필"
                className="w-12 h-12 object-contain"
              />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">
              {profileData?.petName || petName || '반려견'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {profileData?.dogBreed?.name || '견종 정보 없음'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {profileData?.preferredLocation?.name || '지역 정보 없음'}
            </p>
          </div>
          <button
            onClick={() => navigate('/my_profile')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
          >
            프로필 편집
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="bg-white mt-2 border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-center ${
              activeTab === 'profile' 
                ? 'text-green-600 border-b-2 border-green-600 font-semibold' 
                : 'text-gray-500'
            }`}
          >
            내 정보
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 py-3 text-center ${
              activeTab === 'records' 
                ? 'text-green-600 border-b-2 border-green-600 font-semibold' 
                : 'text-gray-500'
            }`}
          >
            산책 기록
          </button>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white">
        {activeTab === 'profile' ? (
          <div className="p-4 space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-600 mb-2">반려견 정보</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span className="font-medium">{profileData?.petName || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">견종</span>
                  <span className="font-medium">{profileData?.dogBreed?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">크기</span>
                  <span className="font-medium">{profileData?.petSize || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">생일</span>
                  <span className="font-medium">{profileData?.petBirthDate || '-'}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-600 mb-2">설정</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/animal_setting')}
                  className="w-full text-left flex justify-between items-center py-2"
                >
                  <span>반려동물 설정</span>
                  <span className="text-gray-400">→</span>
                </button>
                <button
                  onClick={() => navigate('/neighborhood_setting')}
                  className="w-full text-left flex justify-between items-center py-2"
                >
                  <span>동네 설정</span>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="text-sm text-gray-600 mb-2">기타</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/agree_ment')}
                  className="w-full text-left flex justify-between items-center py-2"
                >
                  <span>약관 및 정책</span>
                  <span className="text-gray-400">→</span>
                </button>
                <button
                  className="w-full text-left flex justify-between items-center py-2"
                  onClick={() => alert('준비중입니다')}
                >
                  <span>앱 버전</span>
                  <span className="text-gray-400">1.0.0</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {walkRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                아직 산책 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {walkRecords.map((record) => (
                  <div
                    key={record.walk_record_id}
                    onClick={() => navigate(`/walk_records/${record.walk_record_id}`)}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {new Date(record.created_at).toLocaleDateString('ko-KR')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          거리: {(record.distance / 1000).toFixed(2)}km
                        </p>
                        <p className="text-sm text-gray-600">
                          시간: {Math.floor(record.duration / 60)}분
                        </p>
                      </div>
                      <span className="text-gray-400">→</span>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => navigate('/walk-records')}
                  className="w-full py-3 bg-green-500 text-white rounded-lg mt-4"
                >
                  전체 산책 기록 보기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPage;