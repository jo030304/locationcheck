import { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export default function WebcamCaptureModal({
  open,
  onClose,
  onCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error('웹캠 접근 실패:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setPhotoDataUrl(null);
    };
  }, [open]);

  const handleShot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const url = canvas.toDataURL('image/png');
    setPhotoDataUrl(url);
  };

  const handleUse = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'webcam.png', { type: 'image/png' });
      onCapture(file);
      onClose();
    }, 'image/png');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[92vw] max-w-[520px] p-4 shadow-xl">
        <h2 className="text-base font-semibold mb-3">웹캠으로 촬영</h2>
        <div className="relative w-full">
          {!photoDataUrl ? (
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              playsInline
              muted
            />
          ) : (
            <img
              src={photoDataUrl}
              alt="preview"
              className="w-full rounded-lg"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          {!photoDataUrl ? (
            <button
              onClick={handleShot}
              className="px-4 py-2 bg-[#4FA65B] text-white rounded-lg"
            >
              촬영
            </button>
          ) : (
            <>
              <button
                onClick={() => setPhotoDataUrl(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                다시 찍기
              </button>
              <button
                onClick={handleUse}
                className="px-4 py-2 bg-[#4FA65B] text-white rounded-lg"
              >
                사용하기
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border rounded-lg"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
