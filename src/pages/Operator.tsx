import { BsStopCircleFill } from "react-icons/bs";
import { CgPlayPauseO } from "react-icons/cg";
import { MdOutlineWaterDrop } from "react-icons/md";

const Operator = () => {
  return (
    <div className="border border-gray-300 rounded-2xl bg-white w-screen h-[15vh] flex justify-around items-center px-4">
      <button className="flex-1 flex justify-center">
        <CgPlayPauseO className="w-[7vh] h-[7vh] max-w-[70px] max-h-[70px]" />
      </button>
      <button className="flex-1 flex justify-center">
        <BsStopCircleFill className="w-[7vh] h-[7vh] max-w-[70px] max-h-[70px]" />
      </button>
      <button className="flex-1 flex justify-center">
        <MdOutlineWaterDrop className="w-[7vh] h-[7vh] max-w-[70px] max-h-[70px]" />
      </button>
    </div>
  );
}


export default Operator;