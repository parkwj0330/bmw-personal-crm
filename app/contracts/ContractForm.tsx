"use client";

import { FormEvent, ReactNode } from "react";
import {
  CONTRACT_STATUS,
  FINANCE_COMPANIES,
  calculateBalance,
  calculateTotalPrice,
  currency,
  formatNumber,
} from "./utils";

export type CustomerOption = {
  id: string;
  name: string;
  phone: string;
  interested_model: string | null;
  purchase_method: string | null;
};

export type ContractFormValues = {
  customerId: string;
  contractStatus: string;
  contractDate: string;

  vehicleModel: string;
  trimName: string;
  exteriorColor: string;
  interiorColor: string;
  vin: string;

  vehiclePrice: string;
  optionAmount: string;
  discountAmount: string;
  registrationCost: string;
  depositAmount: string;

  paymentMethod: string;
  financeCompany: string;
  financeTerm: string;
  monthlyPayment: string;
  residualValue: string;

  expectedDeliveryDate: string;
  memo: string;
};

type ContractFormProps = {
  open: boolean;
  editing: boolean;
  saving: boolean;

  customers: CustomerOption[];
  values: ContractFormValues;

  onChange: (
    field: keyof ContractFormValues,
    value: string
  ) => void;

  onCustomerSelect: (customerId: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ContractForm({
  open,
  editing,
  saving,
  customers,
  values,
  onChange,
  onCustomerSelect,
  onClose,
  onSubmit,
}: ContractFormProps) {
  if (!open) {
    return null;
  }

  const vehiclePrice = parseAmount(values.vehiclePrice);
  const optionAmount = parseAmount(values.optionAmount);
  const discountAmount = parseAmount(values.discountAmount);
  const registrationCost = parseAmount(values.registrationCost);
  const depositAmount = parseAmount(values.depositAmount);

  const totalPrice = calculateTotalPrice(
    vehiclePrice,
    optionAmount,
    discountAmount,
    registrationCost
  );

  const balance = calculateBalance(totalPrice, depositAmount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">
              {editing ? "계약 정보 수정" : "신규 계약 등록"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              고객, 차량, 계약금액과 금융정보를 입력하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-8 p-6">
          <section>
            <SectionTitle
              title="기본 정보"
              description="계약 고객과 계약 상태를 선택합니다."
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="고객 선택 *">
                <select
                  value={values.customerId}
                  onChange={(event) =>
                    onCustomerSelect(event.target.value)
                  }
                  className="input-style"
                >
                  <option value="">고객을 선택해주세요</option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.phone}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="계약 상태">
                <select
                  value={values.contractStatus}
                  onChange={(event) =>
                    onChange("contractStatus", event.target.value)
                  }
                  className="input-style"
                >
                  {CONTRACT_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="계약일 *">
                <input
                  type="date"
                  value={values.contractDate}
                  onChange={(event) =>
                    onChange("contractDate", event.target.value)
                  }
                  className="input-style"
                />
              </FormField>

              <FormField label="출고 예정일">
                <input
                  type="date"
                  value={values.expectedDeliveryDate}
                  onChange={(event) =>
                    onChange(
                      "expectedDeliveryDate",
                      event.target.value
                    )
                  }
                  className="input-style"
                />
              </FormField>
            </div>
          </section>

          <section>
            <SectionTitle
              title="차량 정보"
              description="계약 차량의 모델과 색상 정보를 입력합니다."
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="차량 모델 *">
                <input
                  type="text"
                  value={values.vehicleModel}
                  onChange={(event) =>
                    onChange("vehicleModel", event.target.value)
                  }
                  className="input-style"
                  placeholder="예: 520i"
                />
              </FormField>

              <FormField label="트림·등급">
                <input
                  type="text"
                  value={values.trimName}
                  onChange={(event) =>
                    onChange("trimName", event.target.value)
                  }
                  className="input-style"
                  placeholder="예: M Sport"
                />
              </FormField>

              <FormField label="외장 색상">
                <input
                  type="text"
                  value={values.exteriorColor}
                  onChange={(event) =>
                    onChange("exteriorColor", event.target.value)
                  }
                  className="input-style"
                  placeholder="예: 블랙 사파이어"
                />
              </FormField>

              <FormField label="내장 색상">
                <input
                  type="text"
                  value={values.interiorColor}
                  onChange={(event) =>
                    onChange("interiorColor", event.target.value)
                  }
                  className="input-style"
                  placeholder="예: 모카"
                />
              </FormField>

              <FormField label="차대번호 VIN">
                <input
                  type="text"
                  value={values.vin}
                  onChange={(event) =>
                    onChange("vin", event.target.value)
                  }
                  className="input-style"
                  placeholder="배정 후 입력"
                />
              </FormField>
            </div>
          </section>

          <section>
            <SectionTitle
              title="계약 금액"
              description="입력한 금액으로 총 계약금액과 잔금이 자동 계산됩니다."
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MoneyInput
                label="차량 가격 *"
                value={values.vehiclePrice}
                onChange={(value) =>
                  onChange("vehiclePrice", value)
                }
              />

              <MoneyInput
                label="옵션 금액"
                value={values.optionAmount}
                onChange={(value) =>
                  onChange("optionAmount", value)
                }
              />

              <MoneyInput
                label="할인 금액"
                value={values.discountAmount}
                onChange={(value) =>
                  onChange("discountAmount", value)
                }
              />

              <MoneyInput
                label="취등록·부대비용"
                value={values.registrationCost}
                onChange={(value) =>
                  onChange("registrationCost", value)
                }
              />

              <MoneyInput
                label="계약금"
                value={values.depositAmount}
                onChange={(value) =>
                  onChange("depositAmount", value)
                }
              />
            </div>

            <div className="mt-5 grid gap-4 rounded-2xl bg-slate-950 p-5 text-white sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-400">
                  총 계약금액
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {currency(totalPrice)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  차량가 + 옵션 + 부대비용 - 할인
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">
                  예상 잔금
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {currency(balance)}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  총 계약금액 - 계약금
                </p>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle
              title="금융 정보"
              description="현금, 할부, 리스 등 구매조건을 관리합니다."
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="구매 방식">
                <select
                  value={values.paymentMethod}
                  onChange={(event) =>
                    onChange("paymentMethod", event.target.value)
                  }
                  className="input-style"
                >
                  <option value="">선택해주세요</option>
                  <option value="현금">현금</option>
                  <option value="일반 할부">일반 할부</option>
                  <option value="스마트 할부">스마트 할부</option>
                  <option value="리스">리스</option>
                  <option value="장기렌트">장기렌트</option>
                </select>
              </FormField>

              <FormField label="금융사">
                <select
                  value={values.financeCompany}
                  onChange={(event) =>
                    onChange("financeCompany", event.target.value)
                  }
                  className="input-style"
                >
                  <option value="">선택해주세요</option>

                  {FINANCE_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="금융 기간">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={values.financeTerm}
                    onChange={(event) =>
                      onChange("financeTerm", event.target.value)
                    }
                    className="input-style pr-14"
                    placeholder="60"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    개월
                  </span>
                </div>
              </FormField>

              <MoneyInput
                label="월 납입금"
                value={values.monthlyPayment}
                onChange={(value) =>
                  onChange("monthlyPayment", value)
                }
              />

              <MoneyInput
                label="잔존가치"
                value={values.residualValue}
                onChange={(value) =>
                  onChange("residualValue", value)
                }
              />
            </div>
          </section>

          <FormField label="계약 메모">
            <textarea
              value={values.memo}
              onChange={(event) =>
                onChange("memo", event.target.value)
              }
              className="input-style min-h-36 resize-y"
              placeholder="고객 요청사항, 특약, 출고 준비사항 등을 기록하세요."
            />
          </FormField>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {saving
                ? "저장 중..."
                : editing
                  ? "수정 저장"
                  : "계약 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-base font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {description}
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

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value ? formatNumber(value) : ""}
          onChange={(event) =>
            onChange(
              event.target.value.replace(/[^0-9]/g, "")
            )
          }
          className="input-style pr-12"
          placeholder="0"
        />

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
          원
        </span>
      </div>
    </FormField>
  );
}

function parseAmount(value: string) {
  const number = Number(value.replace(/,/g, ""));

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}