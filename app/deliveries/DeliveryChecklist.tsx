"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DeliveryChecklistValues = {
  insurance_completed: boolean;
  registration_completed: boolean;
  tinting_completed: boolean;
  blackbox_completed: boolean;
  ppf_completed: boolean;
  coating_completed: boolean;
  accessories_completed: boolean;
  delivery_photo_completed: boolean;
  handover_completed: boolean;
};

type ChecklistKey = keyof DeliveryChecklistValues;

type DeliveryChecklistProps = {
  deliveryId: string;
  initialValues: DeliveryChecklistValues;
};

const checklistItems: {
  key: ChecklistKey;
  label: string;
  description: string;
}[] = [
  {
    key: "insurance_completed",
    label: "보험 가입",
    description: "자동차보험 가입 여부",
  },
  {
    key: "registration_completed",
    label: "차량 등록·번호판",
    description: "차량 등록과 번호판 발급",
  },
  {
    key: "tinting_completed",
    label: "틴팅",
    description: "틴팅 시공 완료 여부",
  },
  {
    key: "blackbox_completed",
    label: "선납금",
    description: "선납금 입금 여부",
  },
  {
    key: "ppf_completed",
    label: "가상입금",
    description: "가상입금 진행 여부",
  },
  {
    key: "coating_completed",
    label: "품의서 제출",
    description: "품의서 제출 여부",
  },
  {
    key: "accessories_completed",
    label: "액세서리·용품",
    description: "매트와 추가 용품 준비",
  },
  {
    key: "delivery_photo_completed",
    label: "출고 사진",
    description: "출고 사진 촬영 완료",
  },
  {
    key: "handover_completed",
    label: "고객 인도",
    description: "차량 최종 인도 완료",
  },
];

export default function DeliveryChecklist({
  deliveryId,
  initialValues,
}: DeliveryChecklistProps) {
  const [values, setValues] =
    useState<DeliveryChecklistValues>(initialValues);

  const [savingKey, setSavingKey] = useState<ChecklistKey | null>(null);

  const completedCount = useMemo(
    () => Object.values(values).filter(Boolean).length,
    [values]
  );

  const totalCount = checklistItems.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  async function toggleItem(key: ChecklistKey) {
    const previousValue = values[key];
    const nextValue = !previousValue;

    setValues((previous) => ({
      ...previous,
      [key]: nextValue,
    }));

    setSavingKey(key);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setValues((previous) => ({
        ...previous,
        [key]: previousValue,
      }));

      setSavingKey(null);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    const { error } = await supabase
      .from("deliveries")
      .update({
        [key]: nextValue,
      })
      .eq("id", deliveryId)
      .eq("user_id", user.id);

    setSavingKey(null);

    if (error) {
      setValues((previous) => ({
        ...previous,
        [key]: previousValue,
      }));

      alert(`체크 상태를 저장하지 못했습니다.\n${error.message}`);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-bold">출고 준비 체크리스트</h4>

          <p className="mt-1 text-sm text-slate-500">
            {completedCount}/{totalCount}개 완료
          </p>
        </div>

        <p
          className={`text-2xl font-bold ${
            progress === 100 ? "text-emerald-600" : "text-blue-700"
          }`}
        >
          {progress}%
        </p>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress === 100 ? "bg-emerald-500" : "bg-blue-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checklistItems.map((item) => {
          const checked = values[item.key];
          const isSaving = savingKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              disabled={isSaving}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                checked
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-blue-300"
              } disabled:opacity-60`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                  checked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {checked ? "✓" : ""}
              </span>

              <span>
                <span
                  className={`block text-sm font-semibold ${
                    checked ? "text-emerald-800" : "text-slate-800"
                  }`}
                >
                  {item.label}
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  {isSaving ? "저장 중..." : item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="mt-5 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
          모든 출고 준비 항목이 완료되었습니다.
        </div>
      )}
    </div>
  );
}