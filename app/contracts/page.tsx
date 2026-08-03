"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ContractCard from "./ContractCard";
import ContractForm, {
  ContractFormValues,
  CustomerOption,
} from "./ContractForm";
import SummaryCards from "./SummaryCards";
import {
  calculateBalance,
  calculateTotalPrice,
} from "./utils";

export type Contract = {
  id: string;
  user_id: string;
  customer_id: string;
  contract_status: string;
  contract_date: string;

  vehicle_model: string;
  trim_name: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  vin: string | null;

  vehicle_price: number;
  option_amount: number;
  discount_amount: number;
  registration_cost: number;

  deposit_amount: number;
  balance_amount: number;

  payment_method: string | null;
  finance_company: string | null;
  finance_term: number | null;
  monthly_payment: number | null;
  residual_value: number | null;

  expected_delivery_date: string | null;
  memo: string | null;

  created_at: string;
  updated_at: string;
};

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const initialForm: ContractFormValues = {
  customerId: "",
  contractStatus: "계약 예정",
  contractDate: getLocalDateString(),

  vehicleModel: "",
  trimName: "",
  exteriorColor: "",
  interiorColor: "",
  vin: "",

  vehiclePrice: "",
  optionAmount: "",
  discountAmount: "",
  registrationCost: "",
  depositAmount: "",

  paymentMethod: "",
  financeCompany: "",
  financeTerm: "",
  monthlyPayment: "",
  residualValue: "",

  expectedDeliveryDate: "",
  memo: "",
};

export default function ContractsPage() {
  const router = useRouter();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] =
    useState<ContractFormValues>(initialForm);

  const [editingContractId, setEditingContractId] = useState<
    string | null
  >(null);

  const [deletingContractId, setDeletingContractId] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

    await Promise.all([loadContracts(), loadCustomers()]);
    setIsLoading(false);
  }

  async function loadContracts() {
    const { data, error } = await supabase
      .from("contracts")
      .select(
        `
        id,
        user_id,
        customer_id,
        contract_status,
        contract_date,
        vehicle_model,
        trim_name,
        exterior_color,
        interior_color,
        vin,
        vehicle_price,
        option_amount,
        discount_amount,
        registration_cost,
        deposit_amount,
        balance_amount,
        payment_method,
        finance_company,
        finance_term,
        monthly_payment,
        residual_value,
        expected_delivery_date,
        memo,
        created_at,
        updated_at
        `
      )
      .order("contract_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert(`계약 정보를 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setContracts((data as Contract[]) ?? []);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id, name, phone, interested_model, purchase_method"
      )
      .order("name", { ascending: true });

    if (error) {
      alert(`고객 목록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setCustomers((data as CustomerOption[]) ?? []);
  }

  function openNewContract() {
    setEditingContractId(null);
    setForm({
      ...initialForm,
      contractDate: getLocalDateString(),
    });
    setIsFormOpen(true);
  }

  function openEditContract(contract: Contract) {
    setEditingContractId(contract.id);

    setForm({
      customerId: contract.customer_id,
      contractStatus: contract.contract_status,
      contractDate: contract.contract_date,

      vehicleModel: contract.vehicle_model,
      trimName: contract.trim_name ?? "",
      exteriorColor: contract.exterior_color ?? "",
      interiorColor: contract.interior_color ?? "",
      vin: contract.vin ?? "",

      vehiclePrice: String(contract.vehicle_price ?? 0),
      optionAmount: String(contract.option_amount ?? 0),
      discountAmount: String(contract.discount_amount ?? 0),
      registrationCost: String(contract.registration_cost ?? 0),
      depositAmount: String(contract.deposit_amount ?? 0),

      paymentMethod: contract.payment_method ?? "",
      financeCompany: contract.finance_company ?? "",
      financeTerm: contract.finance_term
        ? String(contract.finance_term)
        : "",
      monthlyPayment: contract.monthly_payment
        ? String(contract.monthly_payment)
        : "",
      residualValue: contract.residual_value
        ? String(contract.residual_value)
        : "",

      expectedDeliveryDate:
        contract.expected_delivery_date ?? "",
      memo: contract.memo ?? "",
    });

    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    setIsFormOpen(false);
    setEditingContractId(null);
    setForm(initialForm);
  }

  function updateForm(
    field: keyof ContractFormValues,
    value: string
  ) {
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
      vehicleModel:
        previous.vehicleModel ||
        selectedCustomer.interested_model ||
        "",
      paymentMethod:
        previous.paymentMethod ||
        selectedCustomer.purchase_method ||
        "",
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.customerId) {
      alert("고객을 선택해주세요.");
      return;
    }

    if (!form.contractDate) {
      alert("계약일을 선택해주세요.");
      return;
    }

    if (!form.vehicleModel.trim()) {
      alert("차량 모델을 입력해주세요.");
      return;
    }

    const vehiclePrice = parseAmount(form.vehiclePrice);
    const optionAmount = parseAmount(form.optionAmount);
    const discountAmount = parseAmount(form.discountAmount);
    const registrationCost = parseAmount(
      form.registrationCost
    );
    const depositAmount = parseAmount(form.depositAmount);

    if (vehiclePrice <= 0) {
      alert("차량 가격을 입력해주세요.");
      return;
    }

    const totalPrice = calculateTotalPrice(
      vehiclePrice,
      optionAmount,
      discountAmount,
      registrationCost
    );

    const balanceAmount = calculateBalance(
      totalPrice,
      depositAmount
    );

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

    const contractData = {
      customer_id: form.customerId,
      contract_status: form.contractStatus,
      contract_date: form.contractDate,

      vehicle_model: form.vehicleModel.trim(),
      trim_name: form.trimName.trim() || null,
      exterior_color: form.exteriorColor.trim() || null,
      interior_color: form.interiorColor.trim() || null,
      vin: form.vin.trim() || null,

      vehicle_price: vehiclePrice,
      option_amount: optionAmount,
      discount_amount: discountAmount,
      registration_cost: registrationCost,

      deposit_amount: depositAmount,
      balance_amount: Math.max(0, balanceAmount),

      payment_method: form.paymentMethod || null,
      finance_company: form.financeCompany || null,
      finance_term: form.financeTerm
        ? Number(form.financeTerm)
        : null,
      monthly_payment: form.monthlyPayment
        ? parseAmount(form.monthlyPayment)
        : null,
      residual_value: form.residualValue
        ? parseAmount(form.residualValue)
        : null,

      expected_delivery_date:
        form.expectedDeliveryDate || null,
      memo: form.memo.trim() || null,
    };

    if (editingContractId) {
      const { error } = await supabase
        .from("contracts")
        .update(contractData)
        .eq("id", editingContractId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(
          `계약 정보를 수정하지 못했습니다.\n${error.message}`
        );
        return;
      }

      alert("계약 정보가 수정되었습니다.");
    } else {
      const { error } = await supabase
        .from("contracts")
        .insert({
          ...contractData,
          user_id: user.id,
        });

      setIsSaving(false);

      if (error) {
        alert(`계약을 등록하지 못했습니다.\n${error.message}`);
        return;
      }

      alert("신규 계약이 등록되었습니다.");
    }

    setIsFormOpen(false);
    setEditingContractId(null);
    setForm(initialForm);

    await loadContracts();
  }

  async function handleDelete(contract: Contract) {
    const customer = customers.find(
      (item) => item.id === contract.customer_id
    );

    const shouldDelete = window.confirm(
      `${
        customer?.name ?? "해당"
      } 고객의 ${contract.vehicle_model} 계약을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingContractId(contract.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setDeletingContractId(null);
      alert("로그인이 만료되었습니다.");
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", contract.id)
      .eq("user_id", user.id);

    setDeletingContractId(null);

    if (error) {
      alert(`계약을 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    alert("계약이 삭제되었습니다.");
    await loadContracts();
  }

  const filteredContracts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const customer = customers.find(
        (item) => item.id === contract.customer_id
      );

      const customerName =
        customer?.name.toLowerCase() ?? "";
      const customerPhone =
        customer?.phone.toLowerCase() ?? "";
      const vehicleModel =
        contract.vehicle_model.toLowerCase();
      const vin = contract.vin?.toLowerCase() ?? "";

      const matchesSearch =
        keyword === "" ||
        customerName.includes(keyword) ||
        customerPhone.includes(keyword) ||
        vehicleModel.includes(keyword) ||
        vin.includes(keyword);

      const matchesStatus =
        statusFilter === "전체" ||
        contract.contract_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [contracts, customers, search, statusFilter]);

  const progressingCount = contracts.filter(
    (contract) =>
      contract.contract_status === "계약 예정"
  ).length;

  const completedCount = contracts.filter((contract) =>
    ["계약 완료", "출고 준비", "출고 완료"].includes(
      contract.contract_status
    )
  ).length;

  const totalContractAmount = contracts.reduce(
    (total, contract) =>
      total +
      calculateTotalPrice(
        contract.vehicle_price,
        contract.option_amount,
        contract.discount_amount,
        contract.registration_cost
      ),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-blue-700 hover:text-blue-500"
            >
              ← 대시보드로 돌아가기
            </Link>

            <p className="mt-6 text-xs font-semibold tracking-[0.25em] text-blue-700">
              BMW PERSONAL CRM
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              계약 관리
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              차량 계약, 계약금, 금융 조건과 출고 예정일을
              관리합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewContract}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            + 신규 계약 등록
          </button>
        </header>

        <SummaryCards
          totalCount={contracts.length}
          progressingCount={progressingCount}
          completedCount={completedCount}
          totalContractAmount={totalContractAmount}
        />

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="고객명, 연락처, 차량 또는 VIN 검색"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="전체">전체 상태</option>
              <option value="계약 예정">계약 예정</option>
              <option value="계약 완료">계약 완료</option>
              <option value="출고 준비">출고 준비</option>
              <option value="출고 완료">출고 완료</option>
              <option value="취소">취소</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">계약 목록</h2>

            <p className="text-sm text-slate-500">
              {filteredContracts.length}건
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-500">
              계약 정보를 불러오는 중입니다.
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-slate-500">
                등록된 계약이 없습니다.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                신규 계약 등록 버튼으로 첫 계약을 추가해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  customer={
                    customers.find(
                      (customer) =>
                        customer.id === contract.customer_id
                    ) ?? null
                  }
                  deleting={
                    deletingContractId === contract.id
                  }
                  onEdit={openEditContract}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ContractForm
        open={isFormOpen}
        editing={Boolean(editingContractId)}
        saving={isSaving}
        customers={customers}
        values={form}
        onChange={updateForm}
        onCustomerSelect={selectCustomer}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

function parseAmount(value: string) {
  const number = Number(value.replace(/,/g, ""));

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}