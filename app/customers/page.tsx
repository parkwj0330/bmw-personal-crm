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
  interested_model: string | null;
  current_vehicle: string | null;
  purchase_method: string | null;
  consultation_status: string | null;
  next_contact_date: string | null;
  likelihood: number | null;
  memo: string | null;

  birth_date: string | null;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  preferred_contact_channel: string | null;

  marketing_consent: boolean;
  marketing_consent_at: string | null;
  marketing_opt_out_at: string | null;

  night_marketing_consent: boolean;
  night_marketing_consent_at: string | null;

  consent_source: string | null;
  consent_note: string | null;

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

  birthDate: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  regionSido: string;
  regionSigungu: string;
  preferredContactChannel: string;

  marketingConsent: boolean;
  nightMarketingConsent: boolean;
  consentSource: string;
  consentNote: string;
};

type ConsentHistoryRow = {
  user_id: string;
  customer_id: string;
  consent_type: string;
  consent_value: boolean;
  channel: string | null;
  consent_source: string | null;
  note: string | null;
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

  birthDate: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  regionSido: "",
  regionSigungu: "",
  preferredContactChannel: "전화",

  marketingConsent: false,
  nightMarketingConsent: false,
  consentSource: "",
  consentNote: "",
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(initialForm);

  const [editingCustomerId, setEditingCustomerId] = useState<
    string | null
  >(null);

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
        `
        id,
        name,
        phone,
        interested_model,
        current_vehicle,
        purchase_method,
        consultation_status,
        next_contact_date,
        likelihood,
        memo,
        birth_date,
        postal_code,
        address,
        address_detail,
        region_sido,
        region_sigungu,
        preferred_contact_channel,
        marketing_consent,
        marketing_consent_at,
        marketing_opt_out_at,
        night_marketing_consent,
        night_marketing_consent_at,
        consent_source,
        consent_note,
        created_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(`고객 목록을 불러오지 못했습니다.\n${error.message}`);
      setIsLoading(false);
      return;
    }

    setCustomers((data as Customer[]) ?? []);
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

      birthDate: customer.birth_date ?? "",
      postalCode: customer.postal_code ?? "",
      address: customer.address ?? "",
      addressDetail: customer.address_detail ?? "",
      regionSido: customer.region_sido ?? "",
      regionSigungu: customer.region_sigungu ?? "",
      preferredContactChannel:
        customer.preferred_contact_channel ?? "전화",

      marketingConsent: customer.marketing_consent ?? false,
      nightMarketingConsent:
        customer.night_marketing_consent ?? false,
      consentSource: customer.consent_source ?? "",
      consentNote: customer.consent_note ?? "",
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

  function updateForm<K extends keyof CustomerForm>(
    field: K,
    value: CustomerForm[K]
  ) {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  }

  async function saveConsentHistory(
    userId: string,
    customerId: string,
    previousCustomer: Customer | null,
    marketingConsent: boolean,
    nightMarketingConsent: boolean
  ) {
    const historyRows: ConsentHistoryRow[] = [];

    if (
      !previousCustomer ||
      previousCustomer.marketing_consent !== marketingConsent
    ) {
      historyRows.push({
        user_id: userId,
        customer_id: customerId,
        consent_type: "marketing",
        consent_value: marketingConsent,
        channel: form.preferredContactChannel || null,
        consent_source: form.consentSource || null,
        note: form.consentNote.trim() || null,
      });
    }

    if (
      !previousCustomer ||
      previousCustomer.night_marketing_consent !==
        nightMarketingConsent
    ) {
      historyRows.push({
        user_id: userId,
        customer_id: customerId,
        consent_type: "night_marketing",
        consent_value: nightMarketingConsent,
        channel: form.preferredContactChannel || null,
        consent_source: form.consentSource || null,
        note: form.consentNote.trim() || null,
      });
    }

    if (historyRows.length === 0) {
      return null;
    }

    const { error } = await supabase
      .from("customer_consent_history")
      .insert(historyRows);

    return error?.message ?? null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("고객명을 입력해주세요.");
      return;
    }

    if (!form.phone.trim()) {
      alert("연락처를 입력해주세요.");
      return;
    }

    if (
      (form.marketingConsent ||
        form.nightMarketingConsent) &&
      !form.consentSource
    ) {
      alert("수신동의 경로를 선택해주세요.");
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

    const previousCustomer =
      customers.find(
        (customer) => customer.id === editingCustomerId
      ) ?? null;

    const now = new Date().toISOString();

    const marketingConsent = form.marketingConsent;

    const nightMarketingConsent =
      form.marketingConsent &&
      form.nightMarketingConsent;

    const customerData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      interested_model:
        form.interestedModel.trim() || null,
      current_vehicle:
        form.currentVehicle.trim() || null,
      purchase_method: form.purchaseMethod || null,
      consultation_status: form.consultationStatus,
      next_contact_date:
        form.nextContactDate || null,
      likelihood: Number(form.likelihood),
      memo: form.memo.trim() || null,

      birth_date: form.birthDate || null,
      postal_code: form.postalCode.trim() || null,
      address: form.address.trim() || null,
      address_detail:
        form.addressDetail.trim() || null,
      region_sido: form.regionSido.trim() || null,
      region_sigungu:
        form.regionSigungu.trim() || null,
      preferred_contact_channel:
        form.preferredContactChannel || null,

      marketing_consent: marketingConsent,

      marketing_consent_at: marketingConsent
        ? previousCustomer?.marketing_consent_at ?? now
        : previousCustomer?.marketing_consent_at ?? null,

      marketing_opt_out_at: marketingConsent
        ? null
        : previousCustomer?.marketing_consent
          ? now
          : previousCustomer?.marketing_opt_out_at ?? null,

      night_marketing_consent: nightMarketingConsent,

      night_marketing_consent_at:
        nightMarketingConsent
          ? previousCustomer?.night_marketing_consent_at ??
            now
          : null,

      consent_source: form.consentSource || null,
      consent_note: form.consentNote.trim() || null,
    };

    let savedCustomerId = editingCustomerId;
    let historyErrorMessage: string | null = null;

    if (editingCustomerId) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editingCustomerId)
        .eq("user_id", user.id);

      if (error) {
        setIsSaving(false);

        alert(
          `고객 정보를 수정하지 못했습니다.\n${error.message}`
        );

        return;
      }

      historyErrorMessage = await saveConsentHistory(
        user.id,
        editingCustomerId,
        previousCustomer,
        marketingConsent,
        nightMarketingConsent
      );
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          ...customerData,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (error || !data) {
        setIsSaving(false);

        alert(
          `고객을 저장하지 못했습니다.\n${
            error?.message ?? "등록된 고객 ID를 확인할 수 없습니다."
          }`
        );

        return;
      }

      savedCustomerId = data.id;

      historyErrorMessage = await saveConsentHistory(
        user.id,
        data.id,
        null,
        marketingConsent,
        nightMarketingConsent
      );
    }

    setIsSaving(false);

    if (historyErrorMessage) {
      alert(
        `고객 정보는 저장되었지만 수신동의 이력을 저장하지 못했습니다.\n${historyErrorMessage}`
      );
    } else if (editingCustomerId) {
      alert("고객 정보가 수정되었습니다.");
    } else {
      alert("신규 고객이 등록되었습니다.");
    }

    if (!savedCustomerId) {
      return;
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
      alert(
        `고객을 삭제하지 못했습니다.\n${error.message}`
      );

      return;
    }

    alert("고객 정보가 삭제되었습니다.");
    await loadCustomers();
  }

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const searchableText = [
        customer.name,
        customer.phone,
        customer.interested_model,
        customer.current_vehicle,
        customer.region_sido,
        customer.region_sigungu,
        customer.address,
        customer.preferred_contact_channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" ||
        searchableText.includes(keyword);

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
    (customer) =>
      customer.consultation_status === "계약 예정"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="고객 관리"
          description="상담 고객의 정보와 진행 상태를 관리합니다."
          action={
            <button
              type="button"
              onClick={openRegistrationModal}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + 신규 고객 등록
            </button>
          }
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            label="전체 고객"
            value={`${customers.length}명`}
          />

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
              placeholder="고객명, 연락처, 관심 차종 또는 지역 검색"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
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
              <p className="text-slate-500">
                등록된 고객이 없습니다.
              </p>

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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-bold transition hover:text-blue-600"
                      >
                        {customer.name}
                      </Link>

                      <StatusBadge
                        status={
                          customer.consultation_status ??
                          "신규"
                        }
                      />

                      {customer.marketing_consent && (
                        <ConsentBadge
                          title="마케팅 동의"
                          variant="marketing"
                        />
                      )}

                      {customer.night_marketing_consent && (
                        <ConsentBadge
                          title="야간 동의"
                          variant="night"
                        />
                      )}
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {customer.phone}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatRegion(customer)}
                      {" · "}
                      {customer.preferred_contact_channel ||
                        "선호 연락 미정"}
                    </p>

                    {customer.memo && (
                      <p className="mt-2 line-clamp-1 text-xs text-slate-400">
                        {customer.memo}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      관심 차종
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {customer.interested_model || "미입력"}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      구매 방식:{" "}
                      {customer.purchase_method || "미정"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      다음 연락일
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(
                        customer.next_contact_date
                      )}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      보유 차량:{" "}
                      {customer.current_vehicle || "미입력"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      계약 가능성
                    </p>

                    <StarRating
                      value={customer.likelihood ?? 3}
                    />
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(customer)
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
                    >
                      수정
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(customer)
                      }
                      disabled={
                        deletingCustomerId === customer.id
                      }
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingCustomerId
                    ? "고객 정보 수정"
                    : "신규 고객 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  고객 정보와 자동화 설정을 입력하세요.
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

            <form
              onSubmit={handleSubmit}
              className="space-y-7 p-6"
            >
              <section>
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">
                    기본 상담 정보
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    고객과 차량 상담에 필요한 기본 정보입니다.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="고객명 *">
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        updateForm(
                          "name",
                          event.target.value
                        )
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
                        updateForm(
                          "phone",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="010-1234-5678"
                    />
                  </FormField>

                  <FormField label="관심 차종">
                    <input
                      value={form.interestedModel}
                      onChange={(event) =>
                        updateForm(
                          "interestedModel",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="520i M Sport"
                    />
                  </FormField>

                  <FormField label="현 보유 차량">
                    <input
                      value={form.currentVehicle}
                      onChange={(event) =>
                        updateForm(
                          "currentVehicle",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="G80"
                    />
                  </FormField>

                  <FormField label="구매 방법">
                    <select
                      value={form.purchaseMethod}
                      onChange={(event) =>
                        updateForm(
                          "purchaseMethod",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="">선택</option>
                      <option value="현금">현금</option>
                      <option value="일반 할부">
                        일반 할부
                      </option>
                      <option value="스마트 할부">
                        스마트 할부
                      </option>
                      <option value="리스">리스</option>
                      <option value="장기렌트">
                        장기렌트
                      </option>
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
                      <option value="상담 중">
                        상담 중
                      </option>
                      <option value="견적 발송">
                        견적 발송
                      </option>
                      <option value="시승 예정">
                        시승 예정
                      </option>
                      <option value="계약 예정">
                        계약 예정
                      </option>
                      <option value="보류">보류</option>
                    </select>
                  </FormField>

                  <FormField label="다음 연락일">
                    <input
                      type="date"
                      value={form.nextContactDate}
                      onChange={(event) =>
                        updateForm(
                          "nextContactDate",
                          event.target.value
                        )
                      }
                      className="input-style"
                    />
                  </FormField>

                  <FormField label="계약 가능성">
                    <select
                      value={form.likelihood}
                      onChange={(event) =>
                        updateForm(
                          "likelihood",
                          event.target.value
                        )
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
              </section>

              <section className="border-t border-slate-200 pt-7">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">
                    고객 개인정보
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    생일·지역·연락 채널 자동화에 사용됩니다.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="생년월일">
                    <input
                      type="date"
                      value={form.birthDate}
                      onChange={(event) =>
                        updateForm(
                          "birthDate",
                          event.target.value
                        )
                      }
                      className="input-style"
                    />
                  </FormField>

                  <FormField label="선호 연락 채널">
                    <select
                      value={
                        form.preferredContactChannel
                      }
                      onChange={(event) =>
                        updateForm(
                          "preferredContactChannel",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="">선택</option>
                      <option value="전화">전화</option>
                      <option value="문자">문자</option>
                      <option value="카카오톡">
                        카카오톡
                      </option>
                      <option value="이메일">
                        이메일
                      </option>
                    </select>
                  </FormField>

                  <FormField label="우편번호">
                    <input
                      value={form.postalCode}
                      onChange={(event) =>
                        updateForm(
                          "postalCode",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="17901"
                    />
                  </FormField>

                  <FormField label="시·도">
                    <input
                      value={form.regionSido}
                      onChange={(event) =>
                        updateForm(
                          "regionSido",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="경기도"
                    />
                  </FormField>

                  <FormField label="시·군·구">
                    <input
                      value={form.regionSigungu}
                      onChange={(event) =>
                        updateForm(
                          "regionSigungu",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="평택시"
                    />
                  </FormField>

                  <div className="hidden sm:block" />

                  <div className="sm:col-span-2">
                    <FormField label="주소">
                      <input
                        value={form.address}
                        onChange={(event) =>
                          updateForm(
                            "address",
                            event.target.value
                          )
                        }
                        className="input-style"
                        placeholder="경기도 평택시 비전동"
                      />
                    </FormField>
                  </div>

                  <div className="sm:col-span-2">
                    <FormField label="상세주소">
                      <input
                        value={form.addressDetail}
                        onChange={(event) =>
                          updateForm(
                            "addressDetail",
                            event.target.value
                          )
                        }
                        className="input-style"
                        placeholder="동·호수 또는 상세 위치"
                      />
                    </FormField>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900">
                    메시지 수신동의
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    고객에게 자동 메시지나 마케팅 메시지를
                    발송할 때 사용되는 동의 정보입니다.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={form.marketingConsent}
                      onChange={(event) => {
                        const checked =
                          event.target.checked;

                        updateForm(
                          "marketingConsent",
                          checked
                        );

                        if (!checked) {
                          updateForm(
                            "nightMarketingConsent",
                            false
                          );
                        }
                      }}
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        마케팅 메시지 수신동의
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        이벤트, 프로모션, 신차 및 관심 차종
                        정보를 발송할 수 있습니다.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`flex items-start gap-3 rounded-xl border border-slate-200 p-4 transition ${
                      form.marketingConsent
                        ? "cursor-pointer hover:bg-slate-50"
                        : "cursor-not-allowed bg-slate-50 opacity-60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        form.nightMarketingConsent
                      }
                      disabled={
                        !form.marketingConsent
                      }
                      onChange={(event) =>
                        updateForm(
                          "nightMarketingConsent",
                          event.target.checked
                        )
                      }
                      className="mt-1 h-4 w-4"
                    />

                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        야간 광고 메시지 수신동의
                      </span>

                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        야간 시간대 광고 메시지 발송에 대한
                        별도 동의입니다.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="수신동의 경로">
                    <select
                      value={form.consentSource}
                      onChange={(event) =>
                        updateForm(
                          "consentSource",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="">선택</option>
                      <option value="서면 동의">
                        서면 동의
                      </option>
                      <option value="문자 동의">
                        문자 동의
                      </option>
                      <option value="카카오톡 동의">
                        카카오톡 동의
                      </option>
                      <option value="전화 동의">
                        전화 동의
                      </option>
                      <option value="온라인 폼">
                        온라인 폼
                      </option>
                      <option value="기타">기타</option>
                    </select>
                  </FormField>

                  <FormField label="동의 관련 메모">
                    <input
                      value={form.consentNote}
                      onChange={(event) =>
                        updateForm(
                          "consentNote",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="동의 일시 또는 확인 내용을 입력하세요."
                    />
                  </FormField>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <FormField label="상담 메모">
                  <textarea
                    value={form.memo}
                    onChange={(event) =>
                      updateForm(
                        "memo",
                        event.target.value
                      )
                    }
                    className="input-style min-h-28 resize-y"
                    placeholder="상담 내용과 고객 요청사항을 입력하세요."
                  />
                </FormField>
              </section>

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
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
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
        styleMap[status] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function ConsentBadge({
  title,
  variant,
}: {
  title: string;
  variant: "marketing" | "night";
}) {
  const className =
    variant === "marketing"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {title}
    </span>
  );
}

function StarRating({
  value,
}: {
  value: number;
}) {
  const safeValue = Math.min(
    5,
    Math.max(1, value)
  );

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

function formatRegion(customer: Customer) {
  const region = [
    customer.region_sido,
    customer.region_sigungu,
  ]
    .filter(Boolean)
    .join(" ");

  return region || "지역 미입력";
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}