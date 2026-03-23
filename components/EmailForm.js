"use client";

import { useState } from "react";

export default function EmailForm() {
   const [email, setEmail] = useState("");
   const [status, setStatus] = useState(null);

   async function handleSubmit() {
      if (!email.includes("@")) return;
      setStatus("success");
   }

   return (
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden group my-6">
         {/* Subtle Glow effect */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-colors pointer-events-none -mr-20 -mt-20"></div>

         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏱️</span>
              <h2 className="text-lg font-black text-white tracking-tight">조건 맞는 초급매, 놓치지 마세요</h2>
            </div>
            <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
               설정하신 필터에 맞는 매물이 등록되면 <span className="text-red-400 font-bold">1분 안에 이메일로 즉시</span> 알려드립니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
               <input
                  type="email"
                  placeholder="수신할 이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 focus:bg-gray-800 transition-all placeholder:text-gray-500"
               />
               <button
                  onClick={handleSubmit}
                  className="bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold px-8 py-3.5 rounded-xl transition-all whitespace-nowrap shadow-[0_4px_14px_rgba(220,38,38,0.4)]"
               >
                  무료 알림 받기
               </button>
            </div>

            {status === "success" && (
               <div className="mt-4 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2.5 rounded-lg inline-flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  레이더 등록 완료! 첫 급매물을 기대해주세요.
               </div>
            )}
         </div>
      </div>
   );
}