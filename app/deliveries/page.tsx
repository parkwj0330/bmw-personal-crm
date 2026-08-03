"use client";


import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DeliveryChecklist, {
  DeliveryChecklistValues,
} from "./DeliveryChecklist";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  interested_model: string | null;
};

type Delivery = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  vehicle_model: string;
  trim_name: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  contract_date: string | null;
  delivery_date: string | null;
  registration_number: string | null;
  vin: string | null;
  payment_method: string | null;
  finance_company: string | null;
  insurance_status: string | null;
  registration_status: string | null;
  delivery_status: string | null;
  follow_up_date: string | null;
  memo: string | null;

  insurance_completed: boolean;
  registration_completed: boolean;
  tinting_completed: boolean;
  blackbox_completed: boolean;
  ppf_completed: boolean;
  coating_completed: boolean;
  accessories_completed: boolean;
  delivery_photo_completed: boolean;
  handover_completed: boolean;

  created_at: string;
};

type DeliveryForm = {
  customerId: string;
  customerName: string;
  phone: string;
  vehicleModel: string;
  trimName: string;
  exteriorColor: string;
  interiorColor: string;
  contractDate: string;
  deliveryDate: string;
  registrationNumber: string;
  vin: string;
  paymentMethod: string;
  financeCompany: string;
  insuranceStatus: string;
  registrationStatus: string;
  deliveryStatus: string;
  followUpDate: string;
  memo: string;
};

const initialForm: DeliveryForm = {
  customerId: "",
  customerName: "",
  phone: "",
  vehicleModel: "",
  trimName: "",
  exteriorColor: "",
  interiorColor: "",
  contractDate: "",
  deliveryDate: "",
  registrationNumber: "",
  vin: "",
  paymentMethod: "",
  financeCompany: "",
  insuranceStatus: "미확인",
  registrationStatus: "준비 중",
  deliveryStatus: "출고 준비",
  followUpDate: "",
  memo: "",
};

export default function DeliveriesPage() {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState<DeliveryForm>(initialForm);

  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(
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

    await Promise.all([loadDeliveries(), loadCustomers()]);
    setIsLoading(false);
  }

  async function loadDeliveries() {
    const { data, error } = await supabase
      .from("deliveries")
      .select(
        `
        id,
        customer_id,
        customer_name,
        phone,
        vehicle_model,
        trim_name,
        exterior_color,
        interior_color,
        contract_date,
        delivery_date,
        registration_number,
        vin,
        payment_method,
        finance_company,
        insurance_status,
        registration_status,
        delivery_status,
        follow_up_date,
        memo,
        insurance_completed,
        registration_completed,
        tinting_completed,
        blackbox_completed,
        ppf_completed,
        coating_completed,
        accessories_completed,
        delivery_photo_completed,
        handover_completed,
        created_at
        `
      )
      .order("delivery_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert(`출고 고객을 불러오지 못했습니다.\n${error.message}`);
      setIsLoading(false);
      return;
    }

    setDeliveries(data ?? []);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, phone, interested_model")
      .order("name", { ascending: true });

    if (error) {
      alert(`고객 목록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setCustomers(data ?? []);
  }

  function openRegistrationModal() {
    setEditingDeliveryId(null);
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function openEditModal(delivery: Delivery) {
    setEditingDeliveryId(delivery.id);

    setForm({
      customerId: delivery.customer_id ?? "",
      customerName: delivery.customer_name,
      phone: delivery.phone,
      vehicleModel: delivery.vehicle_model,
      trimName: delivery.trim_name ?? "",
      exteriorColor: delivery.exterior_color ?? "",
      interiorColor: delivery.interior_color ?? "",
      contractDate: delivery.contract_date ?? "",
      deliveryDate: delivery.delivery_date ?? "",
      registrationNumber: delivery.registration_number ?? "",
      vin: delivery.vin ?? "",
      paymentMethod: delivery.payment_method ?? "",
      financeCompany: delivery.finance_company ?? "",
      insuranceStatus: delivery.insurance_status ?? "미확인",
      registrationStatus: delivery.registration_status ?? "준비 중",
      deliveryStatus: delivery.delivery_status ?? "출고 준비",
      followUpDate: delivery.follow_up_date ?? "",
      memo: delivery.memo ?? "",
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingDeliveryId(null);
    setForm(initialForm);
  }

  function updateForm(field: keyof DeliveryForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function selectCustomer(customerId: string) {
    const selectedCustomer = customers.find(
      (customer) => customer.id === customerId
    );

    if (!selectedCustomer) {
      setForm((previous) => ({
        ...previous,
        customerId: "",
      }));
      return;
    }

    setForm((previous) => ({
      ...previous,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      phone: selectedCustomer.phone,
      vehicleModel:
        previous.vehicleModel || selectedCustomer.interested_model || "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.customerName.trim()) {
      alert("고객명을 입력해주세요.");
      return;
    }

    if (!form.phone.trim()) {
      alert("연락처를 입력해주세요.");
      return;
    }

    if (!form.vehicleModel.trim()) {
      alert("출고 차량을 입력해주세요.");
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

    const deliveryData = {
      customer_id: form.customerId || null,
      customer_name: form.customerName.trim(),
      phone: form.phone.trim(),
      vehicle_model: form.vehicleModel.trim(),
      trim_name: form.trimName.trim() || null,
      exterior_color: form.exteriorColor.trim() || null,
      interior_color: form.interiorColor.trim() || null,
      contract_date: form.contractDate || null,
      delivery_date: form.deliveryDate || null,
      registration_number: form.registrationNumber.trim() || null,
      vin: form.vin.trim() || null,
      payment_method: form.paymentMethod || null,
      finance_company: form.financeCompany.trim() || null,
      insurance_status: form.insuranceStatus,
      registration_status: form.registrationStatus,
      delivery_status: form.deliveryStatus,
      follow_up_date: form.followUpDate || null,
      memo: form.memo.trim() || null,
    };

    if (editingDeliveryId) {
      const { error } = await supabase
        .from("deliveries")
        .update(deliveryData)
        .eq("id", editingDeliveryId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(`출고 정보를 수정하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("출고 정보가 수정되었습니다.");
    } else {
      const { error } = await supabase.from("deliveries").insert({
        ...deliveryData,
        user_id: user.id,
      });

      setIsSaving(false);

      if (error) {
        alert(`출고 고객을 등록하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("출고 고객이 등록되었습니다.");
    }

    setIsModalOpen(false);
    setEditingDeliveryId(null);
    setForm(initialForm);

    await loadDeliveries();
  }

  async function handleDelete(delivery: Delivery) {
    const shouldDelete = window.confirm(
      `${delivery.customer_name} 고객의 출고 정보를 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingDeliveryId(delivery.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeletingDeliveryId(null);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("deliveries")
      .delete()
      .eq("id", delivery.id)
      .eq("user_id", user.id);

    setDeletingDeliveryId(null);

    if (error) {
      alert(`출고 정보를 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadDeliveries();
  }

  const filteredDeliveries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const matchesSearch =
        keyword === "" ||
        delivery.customer_name.toLowerCase().includes(keyword) ||
        delivery.phone.toLowerCase().includes(keyword) ||
        delivery.vehicle_model.toLowerCase().includes(keyword) ||
        (delivery.registration_number ?? "")
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "전체" ||
        delivery.delivery_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [deliveries, search, statusFilter]);

  const preparingCount = deliveries.filter(
    (delivery) => delivery.delivery_status === "출고 준비"
  ).length;

  const scheduledCount = deliveries.filter(
    (delivery) => delivery.delivery_status === "출고 예정"
  ).length;

  const completedCount = deliveries.filter(
    (delivery) => delivery.delivery_status === "출고 완료"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            

            <p className="text-xs font-semibold tracking-[0.25em] text-blue-700">
  BMW PERSONAL CRM
</p>

            <h1 className="mt-2 text-3xl font-bold">출고 고객 관리</h1>

            <p className="mt-2 text-sm text-slate-500">
              계약 이후 출고 준비부터 출고 완료까지 관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={openRegistrationModal}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
          >
            + 출고 고객 등록
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="출고 준비" value={`${preparingCount}건`} />
          <SummaryCard label="출고 예정" value={`${scheduledCount}건`} />
          <SummaryCard label="출고 완료" value={`${completedCount}건`} />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              placeholder="고객명, 연락처, 차량 또는 차량번호 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="전체">전체 상태</option>
              <option value="출고 준비">출고 준비</option>
              <option value="출고 예정">출고 예정</option>
              <option value="출고 완료">출고 완료</option>
              <option value="출고 보류">출고 보류</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <h2 className="font-bold">출고 고객 목록</h2>
            <p className="text-sm text-slate-500">
              {filteredDeliveries.length}건
            </p>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-slate-500">
              출고 정보를 불러오는 중입니다.
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-500">
                등록된 출고 고객이 없습니다.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                출고 고객 등록 버튼을 눌러 첫 출고 건을 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredDeliveries.map((delivery) => (
                <article
                  key={delivery.id}
                  className="px-6 py-5 transition hover:bg-slate-50"
                >
                  <div className="grid gap-5 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr_auto]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">
                          {delivery.customer_name}
                        </h3>

                        <DeliveryStatusBadge
                          status={delivery.delivery_status ?? "출고 준비"}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {delivery.phone}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">출고 차량</p>

                      <p className="mt-1 text-sm font-semibold">
                        {delivery.vehicle_model}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {delivery.trim_name || "트림 미입력"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">출고 예정일</p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(delivery.delivery_date)}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        계약일: {formatDate(delivery.contract_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">진행 상태</p>

                      <p className="mt-1 text-sm">
                        보험: {delivery.insurance_status || "미확인"}
                      </p>

                      <p className="mt-1 text-sm">
                        등록: {delivery.registration_status || "준비 중"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openEditModal(delivery)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(delivery)}
                        disabled={deletingDeliveryId === delivery.id}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingDeliveryId === delivery.id
                          ? "삭제 중"
                          : "삭제"}
                      </button>
                    </div>
                  </div>

                  <DeliveryChecklist
                    deliveryId={delivery.id}
                    initialValues={{
                      insurance_completed: delivery.insurance_completed,
                      registration_completed:
                        delivery.registration_completed,
                      tinting_completed: delivery.tinting_completed,
                      blackbox_completed: delivery.blackbox_completed,
                      ppf_completed: delivery.ppf_completed,
                      coating_completed: delivery.coating_completed,
                      accessories_completed:
                        delivery.accessories_completed,
                      delivery_photo_completed:
                        delivery.delivery_photo_completed,
                      handover_completed: delivery.handover_completed,
                    } satisfies DeliveryChecklistValues}
                  />
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
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingDeliveryId
                    ? "출고 정보 수정"
                    : "출고 고객 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  계약 차량과 출고 진행 상태를 입력하세요.
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
              <FormField label="기존 고객 불러오기">
                <select
                  value={form.customerId}
                  onChange={(event) => selectCustomer(event.target.value)}
                  className="input-style"
                >
                  <option value="">직접 입력 또는 고객 선택</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="고객명 *">
                  <input
                    value={form.customerName}
                    onChange={(event) =>
                      updateForm("customerName", event.target.value)
                    }
                    className="input-style"
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
                  />
                </FormField>

                <FormField label="차량 모델 *">
                  <input
                    value={form.vehicleModel}
                    onChange={(event) =>
                      updateForm("vehicleModel", event.target.value)
                    }
                    className="input-style"
                    placeholder="예: X5 xDrive40i"
                  />
                </FormField>

                <FormField label="트림·등급">
                  <input
                    value={form.trimName}
                    onChange={(event) =>
                      updateForm("trimName", event.target.value)
                    }
                    className="input-style"
                    placeholder="예: M Sport Pro"
                  />
                </FormField>

                <FormField label="외장 색상">
                  <input
                    value={form.exteriorColor}
                    onChange={(event) =>
                      updateForm("exteriorColor", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="내장 색상">
                  <input
                    value={form.interiorColor}
                    onChange={(event) =>
                      updateForm("interiorColor", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="계약일">
                  <input
                    type="date"
                    value={form.contractDate}
                    onChange={(event) =>
                      updateForm("contractDate", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="출고 예정일">
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(event) =>
                      updateForm("deliveryDate", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="구매 방식">
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      updateForm("paymentMethod", event.target.value)
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

                <FormField label="금융사">
                  <input
                    value={form.financeCompany}
                    onChange={(event) =>
                      updateForm("financeCompany", event.target.value)
                    }
                    className="input-style"
                    placeholder="예: BMW 파이낸셜"
                  />
                </FormField>

                <FormField label="차량번호">
                  <input
                    value={form.registrationNumber}
                    onChange={(event) =>
                      updateForm("registrationNumber", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="차대번호 VIN">
                  <input
                    value={form.vin}
                    onChange={(event) =>
                      updateForm("vin", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>

                <FormField label="보험 상태">
                  <select
                    value={form.insuranceStatus}
                    onChange={(event) =>
                      updateForm("insuranceStatus", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="미확인">미확인</option>
                    <option value="견적 요청">견적 요청</option>
                    <option value="가입 예정">가입 예정</option>
                    <option value="가입 완료">가입 완료</option>
                  </select>
                </FormField>

                <FormField label="등록 상태">
                  <select
                    value={form.registrationStatus}
                    onChange={(event) =>
                      updateForm("registrationStatus", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="준비 중">준비 중</option>
                    <option value="서류 완료">서류 완료</option>
                    <option value="등록 요청">등록 요청</option>
                    <option value="등록 완료">등록 완료</option>
                  </select>
                </FormField>

                <FormField label="출고 상태">
                  <select
                    value={form.deliveryStatus}
                    onChange={(event) =>
                      updateForm("deliveryStatus", event.target.value)
                    }
                    className="input-style"
                  >
                    <option value="출고 준비">출고 준비</option>
                    <option value="출고 예정">출고 예정</option>
                    <option value="출고 완료">출고 완료</option>
                    <option value="출고 보류">출고 보류</option>
                  </select>
                </FormField>

                <FormField label="사후 연락일">
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(event) =>
                      updateForm("followUpDate", event.target.value)
                    }
                    className="input-style"
                  />
                </FormField>
              </div>

              <FormField label="출고 메모">
                <textarea
                  value={form.memo}
                  onChange={(event) =>
                    updateForm("memo", event.target.value)
                  }
                  className="input-style min-h-32 resize-y"
                  placeholder="틴팅, 블랙박스, PPF, 번호판, 탁송 등 준비사항을 기록하세요."
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
                    : editingDeliveryId
                      ? "수정 저장"
                      : "출고 고객 저장"}
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

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}