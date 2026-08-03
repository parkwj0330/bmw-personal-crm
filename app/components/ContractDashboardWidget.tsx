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

  vehicle_price: number;
  option_amount: number;
  discount_amount: number;
  registration_cost: number;

  deposit_amount: number;
  balance_amount: number;

  expected_delivery_date: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
};

export default function ContractDashboardWidget() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      return;
    }

    const [contractsResult, customersResult] = await Promise.all([
      supabase
        .from("contracts")
        .select(
          `
          id,
          customer_id,
          contract_status,
          contract_date,
          vehicle_model,
          trim_name,
          vehicle_price,
          option_amount,
          discount_amount,
          registration_cost,
          deposit_amount,
          balance_amount,
          expected_delivery_date,
          created_at
          `
        )
        .order("contract_date", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("customers")
        .select("id, name, phone")
        .order("name", { ascending: true }),
    ]);

    setIsLoading(false);

    if (contractsResult.error) {
      console.error(
        "계약 정보를 불러오지 못했습니다.",
        contractsResult.error
      );
    } else {
      setContracts((contractsResult.data as Contract[]) ?? []);
    }

    if (customersResult.error) {
      console.error(
        "고객 정보를 불러오지 못했습니다.",
        customersResult.error
      );
    } else {
      setCustomers((customersResult.data as Customer[]) ?? []);
    }
  }

  const currentMonth = getCurrentMonthString();

  const activeContracts = useMemo(
    () =>
      contracts.filter(
        (contract) =>
          contract.contract_status !== "취소" &&
          contract.contract_status !== "계약 취소"
      ),
    [contracts]
  );

  const progressingContracts = useMemo(
    () =>
      contracts.filter((contract) =>
        ["계약 예정", "계약 진행"].includes(
          contract.contract_status
        )
      ),
    [contracts]
  );

  const monthlyContracts = useMemo(
    () =>
      contracts.filter((contract) =>
        contract.contract_date.startsWith(currentMonth)
      ),
    [contracts, currentMonth]
  );

  const totalContractAmount = useMemo(
    () =>
      activeContracts.reduce(
        (total, contract) =>
          total +
          contract.vehicle_price +
          contract.option_amount +
          contract.registration_cost -
          contract.discount_amount,
        0
      ),
    [activeContracts]
  );

  const recentContracts = activeContracts.slice(0, 3);

  function getCustomer(customerId: string) {
    return (
      customers.find((customer) => customer.id === customerId) ??
      null
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">계약 현황</h2>

          <p className="mt-1 text-sm text-slate-500">
            계약 진행 상태와 최근 등록된 계약을 확인합니다.
          </p>
        </div>

        <Link
          href="/contracts"
          className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-500"
        >
          계약관리 보기
        </Link>
      </div>

      {isLoading ? (
        <div className="py-14 text-center text-sm text-slate-500">
          계약 정보를 불러오는 중입니다.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              label="전체 유효 계약"
              value={`${activeContracts.length}건`}
            />

            <SummaryItem
              label="계약 진행"
              value={`${progressingContracts.length}건`}
            />

            <SummaryItem
              label="이번 달 계약"
              value={`${monthlyContracts.length}건`}
            />

            <SummaryItem
              label="계약 총액"
              value={formatCurrency(totalContractAmount)}
            />
          </div>

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold">최근 계약</h3>

              <p className="text-sm text-slate-400">
                최대 3건
              </p>
            </div>

            {recentContracts.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-5 py-10 text-center">
                <p className="text-sm text-slate-500">
                  등록된 계약이 없습니다.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                {recentContracts.map((contract) => {
                  const customer = getCustomer(
                    contract.customer_id
                  );

                  const totalAmount =
                    contract.vehicle_price +
                    contract.option_amount +
                    contract.registration_cost -
                    contract.discount_amount;

                  return (
                    <article
                      key={contract.id}
                      className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">
                            {customer?.name ??
                              "고객 정보 없음"}
                          </p>

                          <StatusBadge
                            status={contract.contract_status}
                          />
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          {contract.vehicle_model}
                          {contract.trim_name
                            ? ` · ${contract.trim_name}`
                            : ""}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          계약일{" "}
                          {formatDate(
                            contract.contract_date
                          )}
                        </p>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-xs text-slate-400">
                          총 계약금액
                        </p>

                        <p className="mt-1 font-bold">
                          {formatCurrency(totalAmount)}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          출고 예정일{" "}
                          {formatDate(
                            contract.expected_delivery_date
                          )}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-2 break-words text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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
        styles[status] ??
        "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

function getCurrentMonthString() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
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