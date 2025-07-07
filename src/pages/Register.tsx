import React from "react";

interface RegisterProps {
  message: string;
  subMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const Register = ({ message, subMessage, onConfirm, onCancel }: RegisterProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[309px] h-[182px] max-w-[90%] max-h-[90%] sm:w-[309px] sm:h-[182px] text-center shadow-xl flex flex-col justify-between">
        <div>
          <p className="text-lg font-semibold mb-1">{message}</p>
          {subMessage && (
            <p className="text-sm text-[#616160] mb-4">{subMessage}</p>
          )}
        </div>
        <div className="flex justify-between gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 bg-[#CCCCCC] rounded-md text-white font-medium cursor-pointer"
          >
            아니요
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-[#4FA65B] text-white rounded-md font-medium cursor-pointer"
          >
            예
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;
