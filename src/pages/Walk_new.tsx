import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Function from "./function";

const Walk_new = () => {
  return (
    <div>
      <KakaoMap>
        <Record />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Function />
        </div>
      </KakaoMap>
    </div>
  );
}

export default Walk_new