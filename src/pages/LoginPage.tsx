import { BiSolidMessageRounded } from "react-icons/bi";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Kakao: any;
  }
}

const LoginPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(import.meta.env.VITE_KAKAO_JS_KEY);
      console.log("✅ Kakao SDK Initialized");
    }
  }, []);

  const handleKakaoLogin = () => {
    const Kakao = window.Kakao;

    Kakao.Auth.login({
      scope: "profile_nickname",
      success: function (authObj: any) {
        console.log("✅ Kakao 로그인 성공", authObj);

        Kakao.API.request({
          url: "/v2/user/me",
          success: function (res: any) {
            console.log("👤 사용자 정보:", res);
            window.location.href = "/agree_ment";
          },
          fail: function (err: any) {
            console.error("❌ 사용자 정보 요청 실패", err);
          },
        });
      },
      fail: function (err: any) {
        console.error("❌ Kakao 로그인 실패", err);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-12 px-6 bg-white">
      {/* 상단 로고 */}
      <div className="flex flex-col items-center mt-16">
        <img
          src="/로그인 페이지 화면.png"
          alt="산책멍소 로고"
          className="w-[320px] object-contain mb-10"
        />
      </div>

      {/* 로그인 버튼 영역 */}
      <div className="w-[90%] max-w-[350px] flex flex-col gap-3">
        <p className="flex justify-center items-center text-sm text-gray-400">
          서비스를 이용하시려면 로그인 해주세요.
        </p>

        <button
          onClick={handleKakaoLogin}
          className="w-full bg-[#FEE813] text-black py-4 rounded-xl font-semibold shadow flex items-center justify-center gap-2 cursor-pointer"
        >
          <BiSolidMessageRounded className="w-6 h-6" />
          카카오 계정으로 계속하기
        </button>

        <button className="w-full border border-gray-300 py-4 rounded-xl font-semibold shadow flex items-center justify-center gap-2 cursor-pointer">
          <FaApple className="w-6 h-6" />
          Apple 계정으로 계속하기
        </button>

        <button className="w-full border border-gray-300 py-4 rounded-xl font-semibold shadow flex items-center justify-center gap-2 cursor-pointer">
          <FcGoogle className="w-6 h-6" />
          Google 계정으로 계속하기
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
