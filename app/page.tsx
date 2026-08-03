import Link from "next/link";

const menuItems = [
  {
    title: "고객 관리",
    description: "고객 정보와 관심 차량을 관리합니다.",
    icon: "👤",
    href: "/customers",
  },
  {
    title: "오늘의 연락",
    description: "오늘 연락해야 할 고객을 확인합니다.",
    icon: "📞",
    href: "#",
  },
  {
    title: "상담 기록",
    description: "고객별 상담 내용을 기록합니다.",
    icon: "💬",
    href: "#",
  },
  {
    title: "출고 고객 관리",
    description: "출고 일정과 차량 정보를 관리합니다.",
    icon: "🚗",
    href: "/deliveries",
  },
];

const summaryItems = [
  { label: "전체 고객", value: "0명" },
  { label: "오늘 연락", value: "0명" },
  { label: "상담 진행", value: "0명" },
  { label: "출고 예정", value: "0명" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-blue-700">
              BMW SALES MANAGEMENT
            </p>

            <h1 className="mt-1 text-2xl font-bold">Personal CRM</h1>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            WJ
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl bg-slate-950 px-8 py-10 text-white shadow-lg">
          <p className="text-sm text-slate-300">안녕하세요, 우진님</p>

          <h2 className="mt-2 text-3xl font-bold">
            오늘도 좋은 상담을 시작해볼까요?
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            고객 정보와 상담 일정을 한곳에서 관리하세요.
          </p>

          <Link
            href="/customers"
            className="mt-7 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
          >
            + 신규 고객 등록
          </Link>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-bold">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold">빠른 메뉴</h2>
            <p className="mt-1 text-sm text-slate-500">
              필요한 기능을 선택하세요.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {menuItems.map((item) =>
              item.href === "#" ? (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-left opacity-60 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        준비 중
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl transition group-hover:bg-blue-50">
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">오늘 연락할 고객</h2>
              <p className="mt-1 text-sm text-slate-500">
                아직 등록된 연락 일정이 없습니다.
              </p>
            </div>

            <Link
              href="/customers"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              전체 고객 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}