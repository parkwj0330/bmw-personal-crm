"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { supabase } from "@/lib/supabase";

type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  title: string;
  description: string;
  icon: string;
  href: string;
};

const navigationItems: NavigationItem[] = [
  {
    title: "대시보드",
    description: "오늘의 영업 현황",
    icon: "🏠",
    href: "/",
  },
  {
    title: "고객 관리",
    description: "고객 정보와 상담 상태",
    icon: "👤",
    href: "/customers",
  },
  {
    title: "일정 관리",
    description: "전화·시승·계약 일정",
    icon: "📅",
    href: "/schedule",
  },
  {
    title: "계약 관리",
    description: "차량 계약과 금융 조건",
    icon: "📝",
    href: "/contracts",
  },
  {
    title: "출고 관리",
    description: "출고 준비와 차량 인도",
    icon: "🚗",
    href: "/deliveries",
  },
];

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) {
      setUserEmail("");
      return;
    }

    void loadUser();
  }, [isLoginPage]);

  async function loadUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setUserEmail("");
      return;
    }

    setUserEmail(user.email ?? "");
  }

  async function handleLogout() {
    const shouldLogout = window.confirm(
      "로그아웃하시겠습니까?"
    );

    if (!shouldLogout) {
      return;
    }

    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    setIsLoggingOut(false);

    if (error) {
      alert(
        `로그아웃하지 못했습니다.\n${error.message}`
      );
      return;
    }

    setUserEmail("");
    setIsMobileMenuOpen(false);

    router.replace("/login");
    router.refresh();
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* PC 사이드바 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent
          pathname={pathname}
          userEmail={userEmail}
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
        />
      </aside>

      {/* 모바일 사이드바 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() =>
              setIsMobileMenuOpen(false)
            }
            className="absolute inset-0 bg-slate-950/50"
          />

          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <SidebarContent
              pathname={pathname}
              userEmail={userEmail}
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
            />

            <button
              type="button"
              onClick={() =>
                setIsMobileMenuOpen(false)
              }
              className="absolute right-4 top-4 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              aria-label="사이드바 닫기"
            >
              ✕
            </button>
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-64">
        {/* 모바일 상단바 */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(true)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl hover:bg-slate-50"
            aria-label="메뉴 열기"
          >
            ☰
          </button>

          <Link href="/" className="text-center">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-blue-700">
              BMW SALES
            </p>

            <p className="text-sm font-bold">
              Personal CRM
            </p>
          </Link>

          <button
            type="button"
            onClick={() =>
              setIsMobileMenuOpen(true)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white"
            aria-label="계정 메뉴 열기"
          >
            WJ
          </button>
        </header>

        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  userEmail,
  isLoggingOut,
  onLogout,
}: {
  pathname: string;
  userEmail: string;
  isLoggingOut: boolean;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="border-b border-slate-200 px-6 py-6">
        <Link href="/" className="block">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-blue-700">
            BMW SALES MANAGEMENT
          </p>

          <h1 className="mt-2 text-xl font-bold text-slate-950">
            Personal CRM
          </h1>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-400">
          MANAGEMENT
        </p>

        <div className="mt-3 space-y-1">
          {navigationItems.map((item) => {
            const active = isNavigationActive(
              pathname,
              item.href
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                    active
                      ? "bg-white/15"
                      : "bg-slate-100 group-hover:bg-white"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-bold">
                    {item.title}
                  </span>

                  <span
                    className={`mt-0.5 block truncate text-[11px] ${
                      active
                        ? "text-blue-100"
                        : "text-slate-400"
                    }`}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <p className="px-3 text-[11px] font-semibold tracking-[0.16em] text-slate-400">
            AUTOMATION
          </p>

          <div className="mt-3 space-y-2 px-3">
            <Link
  href="/messages"
  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
    isNavigationActive(pathname, "/messages")
      ? "bg-blue-600 text-white shadow-sm"
      : "text-slate-700 hover:bg-slate-100"
  }`}
>
  <span
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
      isNavigationActive(pathname, "/messages")
        ? "bg-white/15"
        : "bg-slate-100 group-hover:bg-white"
    }`}
  >
    💬
  </span>

  <span className="min-w-0 flex-1">
    <span className="block text-sm font-semibold">
      메시지 센터
    </span>

    <span
      className={`mt-0.5 block text-[10px] ${
        isNavigationActive(pathname, "/messages")
          ? "text-blue-100"
          : "text-slate-400"
      }`}
    >
      템플릿 및 발송 관리
    </span>
  </span>
</Link>

            <ComingSoonItem
              icon="⚙️"
              title="자동화 센터"
            />

            <ComingSoonItem
              icon="🤖"
              title="에이전트 기록"
            />
          </div>
        </div>
      </nav>

      <div className="space-y-3 border-t border-slate-200 p-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
              WJ
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">
                로그인 계정
              </p>

              <p
                className="mt-1 truncate text-sm font-semibold text-slate-700"
                title={userEmail}
              >
                {userEmail || "사용자"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {isLoggingOut
              ? "로그아웃 중..."
              : "로그아웃"}
          </button>
        </div>

        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-semibold text-blue-300">
            AUTOMATION PROJECT
          </p>

          <p className="mt-2 text-sm font-bold">
            BMW 영업 자동화 시스템
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            고객·메시지·일정·에이전트를
            단계적으로 연결합니다.
          </p>
        </div>
      </div>
    </>
  );
}

function ComingSoonItem({
  icon,
  title,
}: {
  icon: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-slate-400">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-0.5 text-[10px]">
          준비 중
        </p>
      </div>
    </div>
  );
}

function isNavigationActive(
  pathname: string,
  href: string
) {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}