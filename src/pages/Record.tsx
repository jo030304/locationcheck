const Record = ({ distance }: { distance: number }) => {
  return (
    <div className="mx-7 border border-gray-300 rounded-4xl p-3 bg-[#4FA65B] text-white 
                    text-base sm:text-lg md:text-xl lg:text-2xl">
      <div className="flex items-center justify-between px-4">
        <span className="whitespace-nowrap">산책 코스가 기록되고 있어요!</span>

        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-white opacity-60">|</span>
          <span className="font-semibold">{(distance / 1000).toFixed(2)}km</span>
        </div>
      </div>
    </div>
  );
};

export default Record;
