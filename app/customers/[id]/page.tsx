"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  birth: string | null;
  gender: string | null;
  interested_model: string | null;
  current_vehicle: string | null;
  purchase_method: string | null;
  consultation_status: string | null;
  next_contact_date: string | null;
  likelihood: number | null;
  memo: string | null;
  created_at: string;
};

type ConsultationRecord = {
  id: string;
  consultation_date: string;
  consultation_type: string;
  title: string;
  content: string | null;
  created_at: string;
};

type RecordForm = {
  consultationDate: string;
  consultationType: string;
  title: string;
  content: string;
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

const initialRecordForm: RecordForm = {
  consultationDate: getToday(),
  consultationType: "전화",
  title: "",
  content: "",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [recordForm, setRecordForm] =
    useState<RecordForm>(initialRecordForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(
    null
  );

  useEffect(() => {
    void checkLoginAndLoad();
  }, [customerId]);

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

    await Promise.all([loadCustomer(), loadRecords()]);
    setIsLoading(false);
  }

  async function loadCustomer() {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, user_id, name, phone, birth, gender, interested_model, current_vehicle, purchase_method, consultation_status, next_contact_date, likelihood, memo, created_at"
      )
      .eq("id", customerId)
      .single();

    if (error) {
      alert(`고객 정보를 불러오지 못했습니다.\n${error.message}`);
      router.replace("/customers");
      return;
    }

    setCustomer(data);
  }

  async function loadRecords() {
    const { data, error } = await supabase
      .from("consultation_records")
      .select(
        "id, consultation_date, consultation_type, title, content, created_at"
      )
      .eq("customer_id", customerId)
      .order("consultation_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert(`상담 기록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setRecords(data ?? []);
  }

  function openRecordModal() {
    setRecordForm({
      consultationDate: getToday(),
      consultationType: "전화",
      title: "",
      content: "",
    });

    setIsRecordModalOpen(true);
  }

  function closeRecordModal() {
    if (isSavingRecord) {
      return;
    }

    setIsRecordModalOpen(false);
    setRecordForm(initialRecordForm);
  }

  function updateRecordForm(field: keyof RecordForm, value: string) {
    setRecordForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recordForm.title.trim()) {
      alert("상담 제목을 입력해주세요.");
      return;
    }

    setIsSavingRecord(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSavingRecord(false);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.replace("/login");
      return;
    }

    const { error } = await supabase.from("consultation_records").insert({
      user_id: user.id,
      customer_id: customerId,
      consultation_date: recordForm.consultationDate,
      consultation_type: recordForm.consultationType,
      title: recordForm.title.trim(),
      content: recordForm.content.trim() || null,
    });

    setIsSavingRecord(false);

    if (error) {
      alert(`상담 기록을 저장하지 못했습니다.\n${error.message}`);
      return;
    }

    setIsRecordModalOpen(false);
    setRecordForm(initialRecordForm);
    await loadRecords();
  }

  async function handleDeleteRecord(record: ConsultationRecord) {
    const shouldDelete = window.confirm(
      `"${record.title}" 상담 기록을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingRecordId(record.id);

    const { error } = await supabase
      .from("consultation_records")
      .delete()
      .eq("id", record.id);

    setDeletingRecordId(null);

    if (error) {
      alert(`상담 기록을 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadRecords();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">고객 정보를 불러오는 중입니다.</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-slate-600">고객 정보를 찾을 수 없습니다.</p>

          <Link
            href="/customers"
            className="mt-4 inline-block text-sm font-semibold text-blue-700"
          >
            고객 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/customers"
              className="text-sm font-semibold text-blue-700 transition hover:text-blue-500"
            >
              ← 고객 목록으로 돌아가기
            </Link>

            <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-blue-700">
              BMW PERSONAL CRM
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{customer.name}</h1>

              <StatusBadge
                status={customer.consultation_status ?? "신규"}
              />
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {customer.phone}
            </p>
          </div>

          <button
            type="button"
            onClick={openRecordModal}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            + 상담 기록 추가
          </button>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">고객 정보</h2>

                <Link
                  href="/customers"
                  className="text-sm font-semibold text-blue-700 hover:text-blue-500"
                >
                  목록에서 수정
                </Link>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <InfoItem label="연락처" value={customer.phone} />

                <InfoItem
                  label="관심 차종"
                  value={customer.interested_model || "미입력"}
                />

                <InfoItem
                  label="현 보유 차량"
                  value={customer.current_vehicle || "미입력"}
                />

                <InfoItem
                  label="구매 방법"
                  value={customer.purchase_method || "미정"}
                />

                <InfoItem
                  label="다음 연락일"
                  value={formatDate(customer.next_contact_date)}
                />

                <div>
                  <p className="text-xs text-slate-400">계약 가능성</p>
                  <StarRating value={customer.likelihood ?? 3} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">고객 메모</h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {customer.memo || "등록된 메모가 없습니다."}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">관리 요약</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SummaryBox label="상담 기록" value={`${records.length}건`} />

                <SummaryBox
                  label="고객 등록일"
                  value={formatDateTime(customer.created_at)}
                />
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold">상담 타임라인</h2>

                <p className="mt-1 text-sm text-slate-500">
                  고객과 진행한 상담을 날짜순으로 확인합니다.
                </p>
              </div>

              <p className="text-sm text-slate-500">{records.length}건</p>
            </div>

            {records.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <p className="text-slate-500">
                  아직 등록된 상담 기록이 없습니다.
                </p>

                <button
                  type="button"
                  onClick={openRecordModal}
                  className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-500"
                >
                  첫 상담 기록 추가하기
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="relative space-y-7 border-l-2 border-slate-200 pl-7">
                  {records.map((record) => (
                    <article key={record.id} className="relative">
                      <div className="absolute -left-[37px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white bg-blue-600" />

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <RecordTypeBadge
                                type={record.consultation_type}
                              />

                              <p className="text-sm text-slate-500">
                                {formatDate(record.consultation_date)}
                              </p>
                            </div>

                            <h3 className="mt-3 font-bold">{record.title}</h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(record)}
                            disabled={deletingRecordId === record.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingRecordId === record.id
                              ? "삭제 중"
                              : "삭제"}
                          </button>
                        </div>

                        {record.content && (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                            {record.content}
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      {isRecordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRecordModal();
            }
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">상담 기록 추가</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {customer.name} 고객과 진행한 상담을 기록합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRecordModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="상담일">
                  <input
                    type="date"
                    value={recordForm.consultationDate}
                    onChange={(event) =>
                      updateRecordForm(
                        "consultationDate",
                        event.target.value
                      )
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="상담 유형">
                  <select
                    value={recordForm.consultationType}
                    onChange={(event) =>
                      updateRecordForm(
                        "consultationType",
                        event.target.value
                      )
                    }
                    className="input-style"
                  >
                    <option value="전화">전화</option>
                    <option value="문자">문자·카카오톡</option>
                    <option value="방문">전시장 방문</option>
                    <option value="견적">견적</option>
                    <option value="시승">시승</option>
                    <option value="계약">계약</option>
                    <option value="출고">출고</option>
                    <option value="기타">기타</option>
                  </select>
                </FormField>
              </div>

              <FormField label="상담 제목 *">
                <input
                  type="text"
                  value={recordForm.title}
                  onChange={(event) =>
                    updateRecordForm("title", event.target.value)
                  }
                  className="input-style"
                  placeholder="예: 520i 리스 견적 안내"
                  autoFocus
                />
              </FormField>

              <FormField label="상담 내용">
                <textarea
                  value={recordForm.content}
                  onChange={(event) =>
                    updateRecordForm("content", event.target.value)
                  }
                  className="input-style min-h-36 resize-y"
                  placeholder="고객 요청사항과 상담 내용을 기록하세요."
                />
              </FormField>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeRecordModal}
                  disabled={isSavingRecord}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  취소
                </button>

                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSavingRecord ? "저장 중..." : "상담 기록 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
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

function RecordTypeBadge({ type }: { type: string }) {
  const styleMap: Record<string, string> = {
    전화: "bg-blue-100 text-blue-700",
    문자: "bg-cyan-100 text-cyan-700",
    방문: "bg-purple-100 text-purple-700",
    견적: "bg-violet-100 text-violet-700",
    시승: "bg-emerald-100 text-emerald-700",
    계약: "bg-orange-100 text-orange-700",
    출고: "bg-rose-100 text-rose-700",
    기타: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styleMap[type] ?? "bg-slate-200 text-slate-700"
      }`}
    >
      {type}
    </span>
  );
}

function StarRating({ value }: { value: number }) {
  const safeValue = Math.min(5, Math.max(1, value));

  return (
    <p className="mt-1 text-sm font-semibold">
      <span className="text-amber-500">{"★".repeat(safeValue)}</span>
      <span className="text-slate-300">{"★".repeat(5 - safeValue)}</span>
    </p>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}