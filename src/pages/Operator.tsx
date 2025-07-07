import { BsStopCircleFill } from "react-icons/bs";
import { CgPlayPauseO } from "react-icons/cg";
import { MdOutlineWaterDrop } from "react-icons/md";

const Operator = () => {
  return (
    <div className="relative w-screen h-[15vh]">
      {/* 하얀 박스 */}
      <div className="absolute bottom-0 left-0 right-0 border border-gray-300 rounded-2xl bg-white h-[12vh] flex justify-around items-center px-4 z-10">
        {/* 왼쪽 버튼 */}
        <button className="flex-1 flex flex-col items-center justify-center">
          <CgPlayPauseO className="w-[6vh] h-[6vh] max-w-[70px] max-h-[70px]" />
          <span className="mt-[0.7vh] text-[1.5vh] text-gray-700">
            일시정지
          </span>
        </button>

        <div className="flex-1 flex justify-center" /> {/* 가운데 공간 */}

        {/* 오른쪽 버튼 */}
        <button className="flex-1 flex flex-col items-center justify-center">
          <BsStopCircleFill className="w-[6vh] h-[6vh] max-w-[70px] max-h-[70px]" />
          <span className="mt-[0.7vh] text-[1.5vh] text-gray-700">
            종료
          </span>
        </button>
      </div>

      {/* 가운데 종료 버튼 */}
      <div className="absolute flex flex-col items-center top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <button className="flex flex-col items-center justify-center w-[12vh] h-[12vh] rounded-full border border-[#4FA65B] bg-white shadow-md">
          <MdOutlineWaterDrop className="w-[5vh] h-[5vh] text-[#4FA65B]" />
        </button>
        <span className="mt-[0.5vh] text-[15px] font-bold text-[#4FA65B]">
          마킹
        </span>

      </div>
    </div>
  );
};

export default Operator;
