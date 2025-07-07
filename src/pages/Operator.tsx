import { useState } from "react";
import { BsStopCircleFill } from "react-icons/bs";
import { CgPlayPauseO } from "react-icons/cg";
import { MdWaterDrop } from "react-icons/md";
import Register from "./Register";

const Operator = ({ onMark }: { onMark: () => void }) => {
  const [shadowModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    console.log("코스 등록 진행 중...");
    setShowModal(false);
  };

  const handleCancel = () => {
    console.log("코스 등록 취소됨.");
    setShowModal(false);
  };

  return (
    <div className="relative w-screen h-[15vh]">
      {/* 하얀 박스 */}
      <div className="absolute bottom-0 left-0 right-0 border border-gray-300 rounded-2xl bg-white h-[12vh] flex justify-around items-center px-4 z-10">
        {/* 왼쪽 버튼 */}
        <button className="flex-1 flex flex-col items-center justify-center">
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
          <span className="mt-[0.5vh] text-[15px] font-bold text-[#4FA65B]">마킹</span>
        </div>
      </div>

      {shadowModal && (
        <Register
          message="코스를 등록할까요?"
          subMessage="이웃에게 나만의 산책멍소가 공유됩니다."
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default Operator;
