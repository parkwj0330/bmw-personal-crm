"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contract = {
  id: string;
  customer_id: string;
  contract_status: string;
  contract_date: string;

  vehicle_model: string;
  trim_name: string | null;
  exterior_color: string | null;
  interior_color: string | null;

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
};

type CustomerContractsProps = {
  customerId: string;
};

export default function CustomerContracts({
  customerId,
}: CustomerContractsProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadContracts();
  }, [customerId]);

  async function loadContracts() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("contracts")
      .select(
        `
        id,
        customer_id,
        contract_status,
        contract_date,
        vehicle_model,
        trim_name,
        exterior_color,
        interior_color,
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
        created_at
        `
      )
      .eq("customer_id", customerId)
      .order("contract_date", { ascending: false })
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      alert(`계약 내역을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setContracts((data as Contract[]) ?? []);
  }

  const activeContractCount = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.contract_status !== "취소" &&
          contract.contract_status !== "계약 취소"
      ).length,
    [contracts]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">계약 내역</h2>

          <p className="mt-1 text-sm text-slate-500">
            해당 고객과 연결된 차량 계약을 확인합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            유효 계약 {activeContractCount}건
          </p>

          <Link
            href="/contracts"
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            계약관리 보기
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-14 text-center text-sm text-slate-500">
          계약 내역을 불러오는 중입니다.
        </div>
      ) : contracts.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="text-sm text-slate-500">
            등록된 계약이 없습니다.
          </p>

          <Link
            href="/contracts"
            className="mt-3 inline-block text-sm font-semibold text-blue-700 hover:text-blue-500"
          >
            계약 등록하러 가기 →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {contracts.map((contract) => {
            const totalAmount =
              contract.vehicle_price +
              contract.option_amount +
              contract.registration_cost -
              contract.discount_amount;

            return (
              <article key={contract.id} className="p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">
                          {contract.vehicle_model}
                          {contract.trim_name
                            ? ` · ${contract.trim_name}`
                            : ""}
                        </h3>

                        <ContractStatusBadge
                          status={contract.contract_status}
                        />
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        계약일 {formatDate(contract.contract_date)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400">
                        출고 예정일
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(
                          contract.expected_delivery_date
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MoneyItem
                      label="총 계약금액"
                      value={totalAmount}
                    />

                    <MoneyItem
                      label="계약금"
                      value={contract.deposit_amount}
                    />

                    <MoneyItem
                      label="잔금"
                      value={contract.balance_amount}
                    />

                    <MoneyItem
                      label="할인금액"
                      value={contract.discount_amount}
                    />
                  </div>

                  <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <InfoItem
                      label="구매 방식"
                      value={contract.payment_method}
                    />

                    <InfoItem
                      label="금융사"
                      value={contract.finance_company}
                    />

                    <InfoItem
                      label="금융 기간"
                      value={
                        contract.finance_term
                          ? `${contract.finance_term}개월`
                          : null
                      }
                    />

                    <InfoItem
                      label="월 납입금"
                      value={
                        contract.monthly_payment
                          ? formatCurrency(
                              contract.monthly_payment
                            )
                          : null
                      }
                    />
                  </div>

                  {(contract.exterior_color ||
                    contract.interior_color) && (
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-500">
                      {contract.exterior_color && (
                        <p>
                          외장 색상:{" "}
                          <strong className="text-slate-700">
                            {contract.exterior_color}
                          </strong>
                        </p>
                      )}

                      {contract.interior_color && (
                        <p>
                          내장 색상:{" "}
                          <strong className="text-slate-700">
                            {contract.interior_color}
                          </strong>
                        </p>
                      )}
                    </div>
                  )}

                  {contract.memo && (
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-400">
                        계약 메모
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {contract.memo}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MoneyItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>

      <p className="mt-1 font-bold text-slate-900">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>

      <p className="mt-1 font-semibold text-slate-700">
        {value || "미입력"}
      </p>
    </div>
  );
}

function ContractStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "계약 예정": "bg-blue-100 text-blue-700",
    "계약 진행": "bg-blue-100 text-blue-700",
    "계약 완료": "bg-emerald-100 text-emerald-700",
    "출고 준비": "bg-orange-100 text-orange-700",
    "출고 완료": "bg-violet-100 text-violet-700",
    취소: "bg-red-100 text-red-700",
    "계약 취소": "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatCurrency(value: number) {
  return `${Math.round(value || 0).toLocaleString("ko-KR")}원`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}