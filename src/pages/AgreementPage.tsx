import { useState, useEffect } from 'react';
import { FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { agreeToTerms, fetchTerms } from '../services/users';

type Term = { id: string; title: string };

const AgreementPage = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [allAgreed, setAllAgreed] = useState(false);
  const [agreements, setAgreements] = useState<boolean[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTerms();
        const list: Term[] = res?.data ?? res ?? [];
        if (Array.isArray(list) && list.length > 0) {
          setTerms(list);
          setAgreements(new Array(list.length).fill(false));
          return;
        }
      } catch (e) {
        // no-op: fallback 사용
      }
      const fallback: Term[] = [
        { id: 'term-1', title: '산책멍소 서비스 이용약관 동의 (필수)' },
        { id: 'term-2', title: '개인정보 수집 및 이용 동의 (필수)' },
        { id: 'term-3', title: '위치기반 서비스 이용 동의 (필수)' },
        { id: 'term-4', title: '콘텐츠 공개 및 활용 동의 (필수)' },
      ];
      setTerms(fallback);
      setAgreements(new Array(fallback.length).fill(false));
    })();
  }, []);

  const toggleAll = () => {
    const newValue = !allAgreed;
    setAllAgreed(newValue);
    setAgreements(new Array(terms.length).fill(newValue));
  };

  const toggleAgreement = (index: number) => {
    const updated = [...agreements];
    updated[index] = !updated[index];
    setAgreements(updated);
    setAllAgreed(updated.every((v) => v));
  };

  const isNextEnabled = agreements.length > 0 && agreements.every(Boolean);

  return (
    <div className="min-h-screen p-6 bg-[#FEFFFA] flex flex-col justify-between">
      <div>
        <h1 className="text-3xl font-bold text-green-700">반가워요!</h1>
        <p className="text-gray-600 font-semibold mt-2">
          계속하려면 약관에 동의해주세요.
        </p>

        {/* 전체 동의 */}
        <div className="mt-6 border-b border-gray-200 pb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={toggleAll}
              className="hidden"
            />
            <div
              className={`w-5 h-5 rounded-full border border-gray-300 mb-3 mt-3 flex items-center justify-center ${allAgreed ? 'bg-green-600' : ''}`}
            >
              {allAgreed && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="font-medium text-black text-sm mb-3 mt-3">
              전체 동의
            </span>
          </label>
        </div>

        {/* 개별 약관 */}
        <div className="divide-y divide-gray-100 mt-3">
          {terms.map((term, idx) => (
            <div key={idx} className="flex justify-between items-center py-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreements[idx]}
                  onChange={() => toggleAgreement(idx)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center ${agreements[idx] ? 'bg-green-600' : ''}`}
                >
                  {agreements[idx] && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-800">{term.title}</span>
              </label>
              <FaChevronRight className="text-gray-400 text-xs" />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <button
        onClick={async () => {
          if (!isNextEnabled) return;
          
          // 중복 클릭 방지
          if ((window as any).__isAgreeing) return;
          (window as any).__isAgreeing = true;
          
          try {
            // 선택된 약관의 ID만 추출
            const agreedIds = terms
              .filter((_, idx) => agreements[idx])
              .map((t) => t.id)
              .filter(id => id != null); // null이나 undefined 제거
            
            if (agreedIds.length > 0) {
              await agreeToTerms(agreedIds);
            }
          } catch (e) {
            // 약관 저장 실패시에도 다음 단계로 진행(UX 고려)
          } finally {
            (window as any).__isAgreeing = false;
          }
          navigate('/neighborhood_setting');
        }}
        disabled={!isNextEnabled}
        className={`cursor-pointer w-full py-4 mt-10 rounded-xl font-semibold ${
          isNextEnabled
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        다음
      </button>
    </div>
  );
};

export default AgreementPage;
