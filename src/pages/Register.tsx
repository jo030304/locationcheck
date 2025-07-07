type RegisterProps = {
  message: string;
  subMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const Register = ({ message, subMessage, onConfirm, onCancel }: RegisterProps) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
    >
      <div className="bg-[#FEFFFA] rounded-2xl px-5 py-5 w-[309px] h-[182px] max-w-[90%] max-h-[90%] sm:w-[309px] sm:h-[182px] text-center shadow-xl flex flex-col justify-between">
        <div className="flex flex-col items-center gap-5 flex-1 justify-center">
          <div className="flex flex-col gap-3 leading-relaxed">
            <p className="text-[18px] font-semibold leading-snug">{message}</p>
            {subMessage && (
              <p className="text-[16px] text-[#616160] leading-relaxed">{subMessage}</p>
            )}
          </div>

          <div className="flex gap-4 w-full">
            <button
              onClick={onCancel}
              className="w-[135px] h-[48px] bg-[#CCCCCC] rounded-xl text-white text-[16px] font-medium cursor-pointer"
            >
              아니요
            </button>
            <button
              onClick={onConfirm}
              className="w-[135px] h-[48px] bg-[#4FA65B] text-white rounded-xl text-[16px] font-medium cursor-pointer"
            >
              예
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;