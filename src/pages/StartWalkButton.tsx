import { useNavigate } from 'react-router-dom';
// import Walk_countdown from './Walk_countdown';
import { useSetRecoilState } from 'recoil';
import { walkRecordIdState, walkStartedAtState } from '../hooks/walkAtoms';
import { startWalk } from '../services/walks';

export default function StartWalkButton() {
  const navigate = useNavigate();
  const setWalkRecordId = useSetRecoilState(walkRecordIdState);
  const setWalkStartedAt = useSetRecoilState(walkStartedAtState);

  const handleClick = async () => {
    try {
      const res: any = await startWalk({ walk_type: 'NEW_COURSE' });
      const data = res?.data ?? res;
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
      navigate('/walk_countdown?state=create', {
        state: { startType: 'create' },
      });
    } catch (e) {
      alert('산책을 시작할 수 없습니다. 다시 시도해주세요.');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50
             bg-[#4FA65B] text-white py-3 rounded-full shadow-lg
             w-[50%] cursor-pointer" // 부모 너비의 40%
    >
      산책 시작하기
    </button>
  );
}
