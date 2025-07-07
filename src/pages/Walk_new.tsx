import { useState } from "react";
import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Operator from "./Operator";

const Walk_new = () => {
  const [markRequested, setMarkRequested] = useState(false);

  return (
    <div>
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={() => setMarkRequested(false)}
      >
        <Record />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator onMark={() => setMarkRequested(true)} />
        </div>
      </KakaoMap>
    </div>
  );
};

export default Walk_new;
