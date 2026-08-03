import { currency, badgeColor } from "./utils";

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

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type ContractCardProps = {
  contract: Contract;
  customer: Customer | null;
  deleting: boolean;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
};

export default function ContractCard({
  contract,
  customer,
  deleting,
  onEdit,
  onDelete,
}: ContractCardProps) {
  const totalAmount =
    contract.vehicle_price +
    contract.option_amount +
    contract.registration_cost -
    contract.discount_amount;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-900">
              {customer?.name ?? "연결 고객 없음"}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor(
                contract.contract_status
              )}`}
            >
              {contract.contract_status}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {customer?.phone ?? "연락처 없음"}
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoItem
              label="계약 차량"
              value={`${contract.vehicle_model}${
                contract.trim_name ? ` · ${contract.trim_name}` : ""
              }`}
            />

            <InfoItem
              label="계약일"
              value={formatDate(contract.contract_date)}
            />

            <InfoItem
              label="출고 예정일"
              value={formatDate(contract.expected_delivery_date)}
            />

            <InfoItem
              label="구매 방식"
              value={contract.payment_method || "미정"}
            />
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <MoneyItem
              label="총 계약금액"
              value={currency(totalAmount)}
            />

            <MoneyItem
              label="계약금"
              value={currency(contract.deposit_amount)}
            />

            <MoneyItem
              label="잔금"
              value={currency(contract.balance_amount)}
            />

            <MoneyItem
              label="할인금액"
              value={currency(contract.discount_amount)}
            />
          </div>

          <div className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            <OptionalInfo
              label="외장 색상"
              value={contract.exterior_color}
            />

            <OptionalInfo
              label="내장 색상"
              value={contract.interior_color}
            />

            <OptionalInfo label="VIN" value={contract.vin} />

            <OptionalInfo
              label="금융사"
              value={contract.finance_company}
            />

            <OptionalInfo
              label="금융 기간"
              value={
                contract.finance_term
                  ? `${contract.finance_term}개월`
                  : null
              }
            />

            <OptionalInfo
              label="월 납입금"
              value={
                contract.monthly_payment
                  ? currency(contract.monthly_payment)
                  : null
              }
            />

            <OptionalInfo
              label="잔존가치"
              value={
                contract.residual_value
                  ? currency(contract.residual_value)
                  : null
              }
            />
          </div>

          {contract.memo && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400">
                계약 메모
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {contract.memo}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onEdit(contract)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            수정
          </button>

          <button
            type="button"
            onClick={() => onDelete(contract)}
            disabled={deleting}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "삭제 중" : "삭제"}
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MoneyItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OptionalInfo({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "미정";
  }

  return date.replaceAll("-", ".");
}