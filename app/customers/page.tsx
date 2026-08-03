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

type Customer = {
  id: string;
  name: string;
  phone: string;
  interested_model: string | null;
  current_vehicle: string | null;
  purchase_method: string | null;
  consultation_status: string | null;
  next_contact_date: string | null;
  likelihood: number | null;
  memo: string | null;
  created_at: string;
};

type CustomerForm = {
  name: string;
  phone: string;
  interestedModel: string;
  currentVehicle: string;
  purchaseMethod: string;
  consultationStatus: string;
  nextContactDate: string;
  likelihood: string;
  memo: string;
};

const initialForm: CustomerForm = {
  name: "",
  phone: "",
  interestedModel: "",
  currentVehicle: "",
  purchaseMethod: "",
  consultationStatus: "신규",
  nextContactDate: "",
  likelihood: "3",
  memo: "",
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(initialForm);

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState<
    string | null
  >(null);

  useEffect(() => {
    void checkLoginAndLoadCustomers();
  }, []);

  async function checkLoginAndLoadCustomers() {
    setIsLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/login");
      return;
    }

    await loadCustomers();
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, name, phone, interested_model, current_vehicle, purchase_method, consultation_status, next_contact_date, likelihood, memo, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`고객 목록을 불러오지 못했습니다.\n${error.message}`);
      setIsLoading(false);
      return;
    }

    setCustomers(data ?? []);
    setIsLoading(false);
  }

  function openRegistrationModal() {
    setEditingCustomerId(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomerId(customer.id);

    setForm({
      name: customer.name,
      phone: customer.phone,
      interestedModel: customer.interested_model ?? "",
      currentVehicle: customer.current_vehicle ?? "",
      purchaseMethod: customer.purchase_method ?? "",
      consultationStatus: customer.consultation_status ?? "신규",
      nextContactDate: customer.next_contact_date ?? "",
      likelihood: String(customer.likelihood ?? 3),
      memo: customer.memo ?? "",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingCustomerId(null);
    setForm(initialForm);
  }

  function updateForm(field: keyof CustomerForm, value: string) {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("고객명을 입력해주세요.");
      return;
    }

    if (!form.phone.trim()) {
      alert("연락처를 입력해주세요.");
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

    const customerData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      interested_model: form.interestedModel.trim() || null,
      current_vehicle: form.currentVehicle.trim() || null,
      purchase_method: form.purchaseMethod || null,
      consultation_status: form.consultationStatus,
      next_contact_date: form.nextContactDate || null,
      likelihood: Number(form.likelihood),
      memo: form.memo.trim() || null,
    };

    if (editingCustomerId) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingCustomerId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(`고객 정보를 수정하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("고객 정보가 수정되었습니다.");
    } else {
      const { error } = await supabase.from("customers").insert({
        ...customerData,
        user_id: user.id,
      });

      setIsSaving(false);

      if (error) {
        alert(`고객을 저장하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("신규 고객이 등록되었습니다.");
    }

    setForm(initialForm);
    setEditingCustomerId(null);
    setIsModalOpen(false);

    await loadCustomers();
  }

  async function handleDelete(customer: Customer) {
    const shouldDelete = window.confirm(
      `${customer.name} 고객을 정말 삭제하시겠습니까?\n삭제한 정보는 복구하기 어렵습니다.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCustomerId(customer.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeletingCustomerId(null);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", customer.id)
      .eq("user_id", user.id);

    setDeletingCustomerId(null);

    if (error) {
      alert(`고객을 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    alert("고객 정보가 삭제되었습니다.");
    await loadCustomers();
  }

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const name = customer.name.toLowerCase();
      const phone = customer.phone.toLowerCase();
      const model = customer.interested_model?.toLowerCase() ?? "";

      const matchesSearch =
        keyword === "" ||
        name.includes(keyword) ||
        phone.includes(keyword) ||
        model.includes(keyword);

      const matchesStatus =
        statusFilter === "전체" ||
        customer.consultation_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const consultationCount = customers.filter((customer) =>
    ["상담 중", "견적 발송", "시승 예정"].includes(
      customer.consultation_status ?? ""
    )
  ).length;

  const contractExpectedCount = customers.filter(
    (customer) => customer.consultation_status === "계약 예정"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-700 transition hover:text-blue-500"
            >
              ← 대시보드로 돌아가기
            </Link>

            <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-blue-700">
              BMW PERSONAL CRM
            </p>

            <h1 className="mt-2 text-3xl font-bold">고객 관리</h1>

            <p className="mt-2 text-sm text-slate-500">
              상담 고객의 정보와 진행 상태를 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={openRegistrationModal}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            + 신규 고객 등록
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="전체 고객" value={`${customers.length}명`} />
          <SummaryCard
            label="상담 진행"
            value={`${consultationCount}명`}
          />
          <SummaryCard
            label="계약 예정"
            value={`${contractExpectedCount}명`}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              placeholder="고객명, 연락처 또는 관심 차종 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value="전체">전체 상태</option>
              <option value="신규">신규</option>
              <option value="상담 중">상담 중</option>
              <option value="견적 발송">견적 발송</option>
              <option value="시승 예정">시승 예정</option>
              <option value="계약 예정">계약 예정</option>
              <option value="보류">보류</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h2 className="font-bold">고객 목록</h2>
            <p className="text-sm text-slate-500">
              {filteredCustomers.length}명
            </p>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-slate-500">
              고객 정보를 불러오는 중입니다.
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-500">등록된 고객이 없습니다.</p>
              <p className="mt-2 text-sm text-slate-400">
                신규 고객 등록 버튼을 눌러 첫 고객을 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredCustomers.map((customer) => (
                <article
                  key={customer.id}
                  className="grid gap-5 px-6 py-5 transition hover:bg-slate-50 lg:grid-cols-[1.3fr_1fr_1fr_auto_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
  href={`/customers/${customer.id}`}
  className="font-bold transition hover:text-blue-600"
>
  {customer.name}
</Link>
                      <StatusBadge
                        status={customer.consultation_status ?? "신규"}
                      />
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {customer.phone}
                    </p>

                    {customer.memo && (
                      <p className="mt-2 line-clamp-1 text-xs text-slate-400">
                        {customer.memo}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">관심 차종</p>
                    <p className="mt-1 text-sm font-semibold">
                      {customer.interested_model || "미입력"}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      구매 방식: {customer.purchase_method || "미정"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">다음 연락일</p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(customer.next_contact_date)}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      보유 차량: {customer.current_vehicle || "미입력"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">계약 가능성</p>
                    <StarRating value={customer.likelihood ?? 3} />
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => openEditModal(customer)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
                    >
                      수정
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(customer)}
                      disabled={deletingCustomerId === customer.id}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingCustomerId === customer.id
                        ? "삭제 중"
                        : "삭제"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
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
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingCustomerId
                    ? "고객 정보 수정"
                    : "신규 고객 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  고객의 상담 정보를 입력하세요.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-slate-500 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="고객명 *">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    className="input-style"
                    placeholder="홍길동"
                    autoFocus
                  />
                </FormField>

                <FormField label="연락처 *">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      updateForm("phone", event.target.value)
                    }
                    className="input-style"
                    placeholder="010-1234-5678"
                  />
                </FormField>

                <FormField label="관심 차종">
                  <input
                    value={form.interestedModel}
                    onChange={(event) =>
                      updateForm("interestedModel", event.target.value)
                    }
                    className="input-style"
                    placeholder="520i M Sport"
                  />
                </FormField>

                <FormField label="현 보유 차량">
                  <input
                    value={form.currentVehicle}
                    onChange={(event) =>
                      updateForm("currentVehicle", event.target.value)
                    }
                    className="input-style"
                    placeholder="G80"
                  />
                </FormField>

                <FormField label="구매 방법">
                  <select
                    value={form.purchaseMethod}
                    onChange={(event) =>
                      updateForm("purchaseMethod", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="">선택</option>
                    <option value="현금">현금</option>
                    <option value="일반 할부">일반 할부</option>
                    <option value="스마트 할부">스마트 할부</option>
                    <option value="리스">리스</option>
                    <option value="장기렌트">장기렌트</option>
                  </select>
                </FormField>

                <FormField label="상담 상태">
                  <select
                    value={form.consultationStatus}
                    onChange={(event) =>
                      updateForm(
                        "consultationStatus",
                        event.target.value
                      )
                    }
                    className="input-style"
                  >
                    <option value="신규">신규</option>
                    <option value="상담 중">상담 중</option>
                    <option value="견적 발송">견적 발송</option>
                    <option value="시승 예정">시승 예정</option>
                    <option value="계약 예정">계약 예정</option>
                    <option value="보류">보류</option>
                  </select>
                </FormField>

                <FormField label="다음 연락일">
                  <input
                    type="date"
                    value={form.nextContactDate}
                    onChange={(event) =>
                      updateForm("nextContactDate", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="계약 가능성">
                  <select
                    value={form.likelihood}
                    onChange={(event) =>
                      updateForm("likelihood", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="1">★☆☆☆☆</option>
                    <option value="2">★★☆☆☆</option>
                    <option value="3">★★★☆☆</option>
                    <option value="4">★★★★☆</option>
                    <option value="5">★★★★★</option>
                  </select>
                </FormField>
              </div>

              <FormField label="메모">
                <textarea
                  value={form.memo}
                  onChange={(event) =>
                    updateForm("memo", event.target.value)
                  }
                  className="input-style min-h-28 resize-y"
                  placeholder="상담 내용과 고객 요청사항을 입력하세요."
                />
              </FormField>

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
                    : editingCustomerId
                      ? "수정 저장"
                      : "고객 저장"}
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

function StarRating({ value }: { value: number }) {
  const safeValue = Math.min(5, Math.max(1, value));

  return (
    <p className="mt-1 whitespace-nowrap text-sm font-semibold">
      <span className="text-amber-500">
        {"★".repeat(safeValue)}
      </span>
      <span className="text-slate-300">
        {"★".repeat(5 - safeValue)}
      </span>
    </p>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}