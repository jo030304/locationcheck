import { useState } from "react";
import KakaoMap from "./KakaoMap";
import Record from "./Record";
import Operator from "./Operator";
import StopButton from "./StopButton";

const Walk_new = () => {
  const [markRequested, setMarkRequested] = useState(false);
  const [distance, setDistance] = useState(0);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

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
          <Operator
            onMark={() => setMarkRequested(true)}
            onStop={() => setShowStopModal(true)}           // ✅ 추가
            disabled={buttonsDisabled}
          />
        </div>
      </KakaoMap>
    </div>
  );
};

export default Walk_new;