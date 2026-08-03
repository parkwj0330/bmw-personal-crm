"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ContractDashboardWidget from "./components/ContractDashboardWidget";

type Customer = {
  id: string;
  name: string;
  phone: string;
  interested_model: string | null;
  consultation_status: string | null;
  next_contact_date: string | null;
};

type Schedule = {
  id: string;
  customer_id: string | null;
  title: string;
  schedule_type: string | null;
  schedule_date: string;
  schedule_time: string | null;
  completed: boolean;
};

type Delivery = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  vehicle_model: string;
  delivery_date: string | null;
  delivery_status: string | null;
};

type MenuItem = {
  title: string;
  description: string;
  icon: string;
  href: string;
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const menuItems: MenuItem[] = [
  {
    title: "고객 관리",
    description: "고객 정보, 상담상태와 관심 차량을 관리합니다.",
    icon: "👤",
    href: "/customers",
  },
  {
    title: "일정 관리",
    description: "전화, 시승, 계약과 출고 일정을 확인합니다.",
    icon: "📅",
    href: "/schedule",
  },
  {
    title: "출고 고객 관리",
    description: "출고 준비부터 차량 인도까지 관리합니다.",
    icon: "🚗",
    href: "/deliveries",
  },
  {
  title: "계약 관리",
  description: "차량 계약, 계약금과 금융 조건을 관리합니다.",
  icon: "📝",
  href: "/contracts",
},
];

export default function HomePage() {
  const router = useRouter();
  const today = getLocalDateString();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

 
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    void checkLoginAndLoadDashboard();
  }, []);

  async function checkLoginAndLoadDashboard() {
    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    

    await loadDashboardData();
    setIsLoading(false);
  }

  async function loadDashboardData() {
    const [customersResult, schedulesResult, deliveriesResult] =
      await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, name, phone, interested_model, consultation_status, next_contact_date"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("schedules")
          .select(
            "id, customer_id, title, schedule_type, schedule_date, schedule_time, completed"
          )
          .gte("schedule_date", today)
          .order("schedule_date", { ascending: true })
          .order("schedule_time", { ascending: true }),

        supabase
          .from("deliveries")
          .select(
            "id, customer_id, customer_name, phone, vehicle_model, delivery_date, delivery_status"
          )
          .neq("delivery_status", "출고 완료")
          .order("delivery_date", {
            ascending: true,
            nullsFirst: false,
          }),
      ]);

    if (customersResult.error) {
      alert(
        `고객 정보를 불러오지 못했습니다.\n${customersResult.error.message}`
      );
    } else {
      setCustomers(customersResult.data ?? []);
    }

    if (schedulesResult.error) {
      alert(
        `일정 정보를 불러오지 못했습니다.\n${schedulesResult.error.message}`
      );
    } else {
      setSchedules(schedulesResult.data ?? []);
    }

    if (deliveriesResult.error) {
      alert(
        `출고 정보를 불러오지 못했습니다.\n${deliveriesResult.error.message}`
      );
    } else {
      setDeliveries(deliveriesResult.data ?? []);
    }
  }



  const consultationCount = customers.filter((customer) =>
    ["상담 중", "견적 발송", "시승 예정", "계약 예정"].includes(
      customer.consultation_status ?? ""
    )
  ).length;

  const todaySchedules = useMemo(
    () =>
      schedules.filter(
        (schedule) => schedule.schedule_date === today
      ),
    [schedules, today]
  );

  const pendingTodaySchedules = todaySchedules.filter(
    (schedule) => !schedule.completed
  );

  const upcomingDeliveries = deliveries
    .filter(
      (delivery) =>
        delivery.delivery_status === "출고 준비" ||
        delivery.delivery_status === "출고 예정"
    )
    .slice(0, 5);

  const nextContactCustomers = customers
    .filter(
      (customer) =>
        customer.next_contact_date &&
        customer.next_contact_date <= today
    )
    .slice(0, 5);

  function getCustomer(customerId: string | null) {
    if (!customerId) {
      return null;
    }

    return (
      customers.find((customer) => customer.id === customerId) ??
      null
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-900">


      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl bg-slate-950 px-7 py-9 text-white shadow-lg sm:px-9 sm:py-11">
          <p className="text-sm text-slate-300">
            안녕하세요, 우진님
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            오늘도 좋은 상담을 시작해볼까요?
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            오늘 일정과 고객 상담, 출고 준비 현황을 한곳에서
            확인하세요.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/customers"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold transition hover:bg-blue-500"
            >
              + 신규 고객 등록
            </Link>

            <Link
              href="/schedule"
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold transition hover:bg-slate-800"
            >
              오늘 일정 확인
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="전체 고객"
            value={isLoading ? "-" : `${customers.length}명`}
            href="/customers"
          />

          <SummaryCard
            label="상담 진행"
            value={isLoading ? "-" : `${consultationCount}명`}
            href="/customers"
          />

          <SummaryCard
            label="오늘 미완료 일정"
            value={
              isLoading ? "-" : `${pendingTodaySchedules.length}건`
            }
            href="/schedule"
          />

          <SummaryCard
            label="출고 준비·예정"
            value={
              isLoading ? "-" : `${upcomingDeliveries.length}건`
            }
            href="/deliveries"
          />
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold">빠른 메뉴</h2>

            <p className="mt-1 text-sm text-slate-500">
              필요한 관리 기능을 선택하세요.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl transition group-hover:bg-blue-50">
                    {item.icon}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <DashboardPanel
            title="오늘 일정"
            description={`${todaySchedules.length}건의 일정이 있습니다.`}
            href="/schedule"
            linkLabel="전체 일정 보기"
          >
            {isLoading ? (
              <LoadingMessage />
            ) : todaySchedules.length === 0 ? (
              <EmptyMessage message="오늘 등록된 일정이 없습니다." />
            ) : (
              <div className="divide-y divide-slate-200">
                {todaySchedules.slice(0, 5).map((schedule) => {
                  const customer = getCustomer(schedule.customer_id);

                  return (
                    <article
                      key={schedule.id}
                      className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                          schedule.completed
                            ? "bg-emerald-500"
                            : "bg-blue-600"
                        }`}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <ScheduleTypeBadge
                            type={schedule.schedule_type ?? "기타"}
                          />

                          <span className="text-xs text-slate-400">
                            {schedule.schedule_time || "시간 미정"}
                          </span>

                          {schedule.completed && (
                            <span className="text-xs font-semibold text-emerald-600">
                              완료
                            </span>
                          )}
                        </div>

                        <p
                          className={`mt-2 font-semibold ${
                            schedule.completed
                              ? "text-slate-400 line-through"
                              : ""
                          }`}
                        >
                          {schedule.title}
                        </p>

                        {customer && (
                          <Link
                            href={`/customers/${customer.id}`}
                            className="mt-1 inline-block text-sm text-blue-700 hover:text-blue-500"
                          >
                            {customer.name} · {customer.phone}
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </DashboardPanel>

          <DashboardPanel
            title="출고 준비 현황"
            description={`${upcomingDeliveries.length}건의 출고가 준비 중입니다.`}
            href="/deliveries"
            linkLabel="출고관리 보기"
          >
            {isLoading ? (
              <LoadingMessage />
            ) : upcomingDeliveries.length === 0 ? (
              <EmptyMessage message="준비 중인 출고가 없습니다." />
            ) : (
              <div className="divide-y divide-slate-200">
                {upcomingDeliveries.map((delivery) => (
                  <article
                    key={delivery.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">
                          {delivery.customer_name}
                        </p>

                        <DeliveryStatusBadge
                          status={
                            delivery.delivery_status ?? "출고 준비"
                          }
                        />
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {delivery.vehicle_model}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs text-slate-400">
                        출고 예정일
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(delivery.delivery_date)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>
        <ContractDashboardWidget />

        <section className="mt-6">
          <DashboardPanel
            title="재연락이 필요한 고객"
            description="다음 연락일이 오늘이거나 지난 고객입니다."
            href="/customers"
            linkLabel="고객관리 보기"
          >
            {isLoading ? (
              <LoadingMessage />
            ) : nextContactCustomers.length === 0 ? (
              <EmptyMessage message="현재 재연락이 필요한 고객이 없습니다." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nextContactCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/customers/${customer.id}`}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{customer.name}</p>

                      <StatusBadge
                        status={
                          customer.consultation_status ?? "신규"
                        }
                      />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {customer.phone}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      관심 차종:{" "}
                      {customer.interested_model || "미입력"}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-orange-600">
                      연락일:{" "}
                      {formatDate(customer.next_contact_date)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </Link>
  );
}

function DashboardPanel({
  title,
  description,
  href,
  linkLabel,
  children,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-500"
        >
          {linkLabel}
        </Link>
      </div>

      <div className="pt-5">{children}</div>
    </section>
  );
}

function LoadingMessage() {
  return (
    <p className="py-8 text-center text-sm text-slate-500">
      정보를 불러오는 중입니다.
    </p>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}

function ScheduleTypeBadge({ type }: { type: string }) {
  const styleMap: Record<string, string> = {
    전화: "bg-blue-100 text-blue-700",
    문자: "bg-cyan-100 text-cyan-700",
    방문: "bg-purple-100 text-purple-700",
    시승: "bg-emerald-100 text-emerald-700",
    견적: "bg-violet-100 text-violet-700",
    계약: "bg-orange-100 text-orange-700",
    출고: "bg-rose-100 text-rose-700",
    보험: "bg-amber-100 text-amber-700",
    기타: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styleMap[type] ?? styleMap.기타
      }`}
    >
      {type}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    "출고 준비": "bg-blue-100 text-blue-700",
    "출고 예정": "bg-orange-100 text-orange-700",
    "출고 완료": "bg-emerald-100 text-emerald-700",
    "출고 보류": "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styleMap[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    신규: "bg-slate-100 text-slate-700",
    "상담 중": "bg-blue-100 text-blue-700",
    "견적 발송": "bg-violet-100 text-violet-700",
    "시승 예정": "bg-cyan-100 text-cyan-700",
    "계약 예정": "bg-orange-100 text-orange-700",
    보류: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styleMap[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}