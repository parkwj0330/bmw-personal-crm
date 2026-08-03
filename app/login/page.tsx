"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function signUp() {
    if (!email.trim() || !password.trim()) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      alert("비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "회원가입이 완료되었습니다. 인증 메일이 도착했다면 메일에서 인증을 완료해주세요."
    );
  }

  async function signIn() {
    if (!email.trim() || !password.trim()) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("로그인 성공");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-[400px] rounded-2xl bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold tracking-[0.25em] text-blue-700">
          BMW SALES MANAGEMENT
        </p>

        <h1 className="mt-2 mb-6 text-2xl font-bold">
          BMW CRM 로그인
        </h1>

        <input
          className="mb-3 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        <input
          className="mb-5 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              signIn();
            }
          }}
        />

        <button
          type="button"
          onClick={signIn}
          disabled={isLoading}
          className="mb-3 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "처리 중..." : "로그인"}
        </button>

        <button
          type="button"
          onClick={signUp}
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-950 p-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          회원가입
        </button>
      </div>
    </main>
  );
}