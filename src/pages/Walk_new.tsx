import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Function from "./function";

const Walk_new = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 스크롤 가능한 영역 */}
      <div className="w-full h-full overflow-y-auto pb-[80px]"> {/* ⬅︎ 여유 공간 확보 */}
        <KakaoMap>
          <Record />
        </KakaoMap>
      </div>

      {/* 바닥 고정된 Function */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-[430px] px-4 z-50 flex justify-center">
        <Function />
      </div>

    </div>
  );
};

export default Walk_new;
