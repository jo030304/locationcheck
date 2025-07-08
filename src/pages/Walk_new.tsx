import { useState } from "react";
import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Operator from "./Operator";

const Walk_new = () => {
  const [markRequested, setMarkRequested] = useState(false);
  const [distance, setDistance] = useState(0);

  return (
    <div>
      <KakaoMap
        markRequested={markRequested}
        onMarkHandled={() => setMarkRequested(false)}
        drawingEnabled={true}
        onDistanceChange={setDistance}
      >
        <Record distance={distance} />
        <div className="absolute bottom-0 w-full flex justify-center">
          <Operator onMark={() => setMarkRequested(true)} />
        </div>
      </KakaoMap>
    </div>
  );
};

export default Walk_new;
