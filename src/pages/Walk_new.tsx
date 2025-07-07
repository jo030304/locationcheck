import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Operator from "./Operator";

const Walk_new = () => {
  return (
    <div>
      <KakaoMap>
        <Record />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator />
        </div>
      </KakaoMap>
    </div>
  );
}

export default Walk_new