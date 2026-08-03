"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageHeader from "../components/PageHeader";

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type Schedule = {
  id: string;
  customer_id: string | null;
  title: string;
  schedule_type: string | null;
  schedule_date: string;
  schedule_time: string | null;
  memo: string | null;
  completed: boolean;
  created_at: string;
};

type ScheduleForm = {
  customerId: string;
  title: string;
  scheduleType: string;
  scheduleDate: string;
  scheduleTime: string;
  memo: string;
  completed: boolean;
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialForm: ScheduleForm = {
  customerId: "",
  title: "",
  scheduleType: "전화",
  scheduleDate: getLocalDateString(),
  scheduleTime: "",
  memo: "",
  completed: false,
};

export default function SchedulePage() {
  const router = useRouter();

  const today = getLocalDateString();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<ScheduleForm>(initialForm);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState("전체");

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(
    null
  );

  useEffect(() => {
    void checkLoginAndLoad();
  }, []);

  async function checkLoginAndLoad() {
    setIsLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/login");
      return;
    }

    await Promise.all([loadSchedules(), loadCustomers()]);
    setIsLoading(false);
  }

  async function loadSchedules() {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        id,
        customer_id,
        title,
        schedule_type,
        schedule_date,
        schedule_time,
        memo,
        completed,
        created_at
        `
      )
      .order("schedule_date", { ascending: true })
      .order("schedule_time", { ascending: true });

    if (error) {
      alert(`일정을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setSchedules(data ?? []);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone")
      .order("name", { ascending: true });

    if (error) {
      alert(`고객 목록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setCustomers(data ?? []);
  }

  function openRegistrationModal(date = selectedDate) {
    setEditingScheduleId(null);

    setForm({
      ...initialForm,
      scheduleDate: date,
    });

    setIsModalOpen(true);
  }

  function openEditModal(schedule: Schedule) {
    setEditingScheduleId(schedule.id);

    setForm({
      customerId: schedule.customer_id ?? "",
      title: schedule.title,
      scheduleType: schedule.schedule_type ?? "전화",
      scheduleDate: schedule.schedule_date,
      scheduleTime: schedule.schedule_time ?? "",
      memo: schedule.memo ?? "",
      completed: schedule.completed,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingScheduleId(null);
    setForm(initialForm);
  }

  function updateForm(
    field: keyof ScheduleForm,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }

    if (!form.scheduleDate) {
      alert("일정 날짜를 선택해주세요.");
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.replace("/login");
      return;
    }

    const scheduleData = {
      customer_id: form.customerId || null,
      title: form.title.trim(),
      schedule_type: form.scheduleType,
      schedule_date: form.scheduleDate,
      schedule_time: form.scheduleTime || null,
      memo: form.memo.trim() || null,
      completed: form.completed,
    };

    if (editingScheduleId) {
      const { error } = await supabase
        .from("schedules")
        .update(scheduleData)
        .eq("id", editingScheduleId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(`일정을 수정하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("일정이 수정되었습니다.");
    } else {
      const { error } = await supabase.from("schedules").insert({
        ...scheduleData,
        user_id: user.id,
      });

      setIsSaving(false);

      if (error) {
        alert(`일정을 등록하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("일정이 등록되었습니다.");
    }

    setSelectedDate(form.scheduleDate);
    setIsModalOpen(false);
    setEditingScheduleId(null);
    setForm(initialForm);

    await loadSchedules();
  }

  async function handleDelete(schedule: Schedule) {
    const shouldDelete = window.confirm(
      `"${schedule.title}" 일정을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingScheduleId(schedule.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeletingScheduleId(null);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", schedule.id)
      .eq("user_id", user.id);

    setDeletingScheduleId(null);

    if (error) {
      alert(`일정을 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadSchedules();
  }

  async function toggleCompleted(schedule: Schedule) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("schedules")
      .update({
        completed: !schedule.completed,
      })
      .eq("id", schedule.id)
      .eq("user_id", user.id);

    if (error) {
      alert(`완료 상태를 변경하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadSchedules();
  }

  function moveMonth(amount: number) {
    setCurrentMonth(
      (previous) =>
        new Date(
          previous.getFullYear(),
          previous.getMonth() + amount,
          1
        )
    );
  }

  function moveToToday() {
    const now = new Date();

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    setSelectedDate(today);
  }

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(year, month, 1 - firstDay.getDay());
    const endDate = new Date(
      year,
      month,
      lastDay.getDate() + (6 - lastDay.getDay())
    );

    const days: Date[] = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [currentMonth]);

  const filteredSchedules = useMemo(() => {
    if (typeFilter === "전체") {
      return schedules;
    }

    return schedules.filter(
      (schedule) => schedule.schedule_type === typeFilter
    );
  }, [schedules, typeFilter]);

  const selectedDateSchedules = filteredSchedules.filter(
    (schedule) => schedule.schedule_date === selectedDate
  );

  const todaySchedules = schedules.filter(
    (schedule) => schedule.schedule_date === today
  );

  const pendingTodayCount = todaySchedules.filter(
    (schedule) => !schedule.completed
  ).length;

  const upcomingCount = schedules.filter(
    (schedule) =>
      schedule.schedule_date > today && !schedule.completed
  ).length;

  function getCustomer(customerId: string | null) {
    if (!customerId) {
      return null;
    }

    return customers.find((customer) => customer.id === customerId) ?? null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
  title="일정 관리"
  description="고객 연락, 시승, 계약과 출고 일정을 관리합니다."
  action={
    <button
      type="button"
      onClick={() => openRegistrationModal()}
      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
    >
      + 새 일정 등록
    </button>
  }
/>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="오늘 일정"
            value={`${todaySchedules.length}건`}
          />

          <SummaryCard
            label="오늘 미완료"
            value={`${pendingTodayCount}건`}
          />

          <SummaryCard
            label="다가오는 일정"
            value={`${upcomingCount}건`}
          />
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50"
                  aria-label="이전 달"
                >
                  ‹
                </button>

                <h2 className="min-w-32 text-center text-lg font-bold">
                  {currentMonth.getFullYear()}년{" "}
                  {currentMonth.getMonth() + 1}월
                </h2>

                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="rounded-lg border border-slate-300 px-3 py-2 hover:bg-slate-50"
                  aria-label="다음 달"
                >
                  ›
                </button>

                <button
                  type="button"
                  onClick={moveToToday}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  오늘
                </button>
              </div>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="전체">전체 일정</option>
                <option value="전화">전화</option>
                <option value="문자">문자·카카오톡</option>
                <option value="방문">전시장 방문</option>
                <option value="시승">시승</option>
                <option value="견적">견적</option>
                <option value="계약">계약</option>
                <option value="출고">출고</option>
                <option value="보험">보험</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {["일", "월", "화", "수", "목", "금", "토"].map(
                (day, index) => (
                  <div
                    key={day}
                    className={`px-2 py-3 text-center text-xs font-semibold ${
                      index === 0
                        ? "text-red-500"
                        : index === 6
                          ? "text-blue-500"
                          : "text-slate-500"
                    }`}
                  >
                    {day}
                  </div>
                )
              )}
            </div>

            {isLoading ? (
              <div className="flex min-h-96 items-center justify-center text-slate-500">
                일정을 불러오는 중입니다.
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((date) => {
                  const dateString = getLocalDateString(date);

                  const dateSchedules = filteredSchedules.filter(
                    (schedule) =>
                      schedule.schedule_date === dateString
                  );

                  const isCurrentMonth =
                    date.getMonth() === currentMonth.getMonth();

                  const isToday = dateString === today;
                  const isSelected = dateString === selectedDate;
                  const dayOfWeek = date.getDay();

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => setSelectedDate(dateString)}
                      onDoubleClick={() =>
                        openRegistrationModal(dateString)
                      }
                      className={`min-h-28 border-b border-r border-slate-200 p-2 text-left align-top transition hover:bg-blue-50 ${
                        !isCurrentMonth
                          ? "bg-slate-50 text-slate-300"
                          : "bg-white"
                      } ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""}`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                          isToday
                            ? "bg-blue-600 font-bold text-white"
                            : dayOfWeek === 0
                              ? "text-red-500"
                              : dayOfWeek === 6
                                ? "text-blue-500"
                                : ""
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <div className="mt-2 space-y-1">
                        {dateSchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className={`truncate rounded px-2 py-1 text-[11px] font-medium ${
                              schedule.completed
                                ? "bg-slate-100 text-slate-400 line-through"
                                : getTypeStyle(schedule.schedule_type)
                            }`}
                          >
                            {schedule.schedule_time
                              ? `${schedule.schedule_time} `
                              : ""}
                            {schedule.title}
                          </div>
                        ))}

                        {dateSchedules.length > 3 && (
                          <p className="px-1 text-[11px] text-slate-400">
                            +{dateSchedules.length - 3}건
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
                <div>
                  <h2 className="font-bold">
                    {formatDate(selectedDate)} 일정
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedDateSchedules.length}건
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openRegistrationModal(selectedDate)
                  }
                  className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  + 추가
                </button>
              </div>

              {selectedDateSchedules.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm text-slate-500">
                    등록된 일정이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {selectedDateSchedules.map((schedule) => {
                    const customer = getCustomer(schedule.customer_id);

                    return (
                      <article
                        key={schedule.id}
                        className="p-5"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCompleted(schedule)}
                            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                              schedule.completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                            aria-label="완료 상태 변경"
                          >
                            {schedule.completed ? "✓" : ""}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <ScheduleTypeBadge
                                type={schedule.schedule_type ?? "기타"}
                              />

                              <span className="text-xs text-slate-500">
                                {schedule.schedule_time || "시간 미정"}
                              </span>
                            </div>

                            <h3
                              className={`mt-2 font-bold ${
                                schedule.completed
                                  ? "text-slate-400 line-through"
                                  : ""
                              }`}
                            >
                              {schedule.title}
                            </h3>

                            {customer && (
                              <Link
                                href={`/customers/${customer.id}`}
                                className="mt-2 block text-sm font-semibold text-blue-700 hover:text-blue-500"
                              >
                                {customer.name} · {customer.phone}
                              </Link>
                            )}

                            {schedule.memo && (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                                {schedule.memo}
                              </p>
                            )}

                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(schedule)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                              >
                                수정
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(schedule)}
                                disabled={
                                  deletingScheduleId === schedule.id
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingScheduleId === schedule.id
                                  ? "삭제 중"
                                  : "삭제"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">사용 방법</h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                날짜를 한 번 클릭하면 해당 날짜의 일정을 확인합니다.
                날짜를 두 번 클릭하면 해당 날짜로 새 일정 등록창이
                열립니다.
              </p>
            </section>
          </aside>
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingScheduleId ? "일정 수정" : "새 일정 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  고객 연락, 시승, 계약 또는 출고 일정을 입력하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <FormField label="연결 고객">
                <select
                  value={form.customerId}
                  onChange={(event) =>
                    updateForm("customerId", event.target.value)
                  }
                  className="input-style"
                >
                  <option value="">고객 연결 안 함</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="일정 유형">
                  <select
                    value={form.scheduleType}
                    onChange={(event) =>
                      updateForm("scheduleType", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="전화">전화</option>
                    <option value="문자">문자·카카오톡</option>
                    <option value="방문">전시장 방문</option>
                    <option value="시승">시승</option>
                    <option value="견적">견적</option>
                    <option value="계약">계약</option>
                    <option value="출고">출고</option>
                    <option value="보험">보험</option>
                    <option value="기타">기타</option>
                  </select>
                </FormField>

                <FormField label="일정 제목 *">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    className="input-style"
                    placeholder="예: 520i 시승"
                  />
                </FormField>

                <FormField label="날짜 *">
                  <input
                    type="date"
                    value={form.scheduleDate}
                    onChange={(event) =>
                      updateForm("scheduleDate", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="시간">
                  <input
                    type="time"
                    value={form.scheduleTime}
                    onChange={(event) =>
                      updateForm("scheduleTime", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>
              </div>

              <FormField label="메모">
                <textarea
                  value={form.memo}
                  onChange={(event) =>
                    updateForm("memo", event.target.value)
                  }
                  className="input-style min-h-32 resize-y"
                  placeholder="준비사항과 고객 요청사항 등을 기록하세요."
                />
              </FormField>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={form.completed}
                  onChange={(event) =>
                    updateForm("completed", event.target.checked)
                  }
                  className="h-5 w-5"
                />

                <span className="text-sm font-semibold">
                  완료된 일정으로 표시
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSaving
                    ? "저장 중..."
                    : editingScheduleId
                      ? "수정 저장"
                      : "일정 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function ScheduleTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTypeStyle(
        type
      )}`}
    >
      {type}
    </span>
  );
}

function getTypeStyle(type: string | null) {
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

  return styleMap[type ?? "기타"] ?? styleMap.기타;
}

function formatDate(date: string) {
  return date.replaceAll("-", ".");
}