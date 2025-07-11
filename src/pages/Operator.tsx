import { useState } from "react";
import { BsStopCircleFill } from "react-icons/bs";
import { CgPlayPauseO } from "react-icons/cg";
import { MdWaterDrop } from "react-icons/md";
import EndButton from "./EndButton";
import StopButton from "./StopButton";
import { useNavigate } from "react-router-dom";

const Operator = ({ onMark }: { onMark: () => void }) => {
  const [shadowModal1, setShowModal1] = useState(false);
  const [shadowModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = () => {
    setShowModal(false);
    setShowModal1(false);
    navigate("/koricopter?result=yes");
  };

  const handleCancel = () => {
    setShowModal(false);
    setShowModal1(false);
    navigate("/koricopter?result=no");
  };

  // ✅ StopButton 전용 Confirm (navigate 없음)
  const handlePauseConfirm = () => {
    setShowModal1(false);
  };

  return (
    <div className="relative w-screen h-[15vh]">
      {/* 하얀 박스 */}
      <div className="absolute bottom-0 left-0 right-0 border border-gray-300 rounded-2xl bg-white h-[12vh] flex justify-around items-center px-4 z-10">
        {/* 왼쪽 버튼 */}
        <button
          onClick={() => setShowModal1(true)}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <CgPlayPauseO className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          <span className="mt-[0.7vh] text-[1.5vh] text-[#CCCCCC] font-semibold">
            일시정지
          </span>
        </button>

        <div className="flex-1 flex justify-center" /> {/* 가운데 공간 */}

        {/* 오른쪽 버튼 */}
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <BsStopCircleFill className="w-[6vh] h-[6vh] text-[#CCCCCC] cursor-pointer" />
          <span className="mt-[0.7vh] text-[1.5vh] text-[#CCCCCC] font-semibold">
            종료
          </span>
        </button>

        {/* 가운데 마킹 버튼 */}
        <div className="absolute flex flex-col items-center top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            onClick={onMark}
            className="flex flex-col items-center justify-center bg-[#4FA65B] w-[10vh] h-[10vh] rounded-full cursor-pointer"
          >
            <MdWaterDrop className="w-[5vh] h-[5vh] text-white" />
          </button>
          <span className="mt-[0.5vh] text-[15px] font-bold text-[#4FA65B]">
            마킹
          </span>
        </div>
      </div>

      {shadowModal && (
        <EndButton
          message="코스를 등록할까요?"
          subMessage={`이웃에게 나만의 산책 멍소가 공유됩니다.`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {shadowModal1 && (
        <StopButton
          subMessage={`일시정지 중 코스에서 멀리 이동하면\n꼬리콥터를 흔들 수 없어요.\n코스로 돌아와서 재시작 해주세요.`}
          onConfirm={handlePauseConfirm} // ✅ 수정됨
        />
      )}
    </div>
  );
};

export default Operator;
