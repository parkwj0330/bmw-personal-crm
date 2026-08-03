export const CONTRACT_STATUS = [
  "계약 예정",
  "계약 완료",
  "출고 준비",
  "출고 완료",
  "취소",
] as const;

export const FINANCE_COMPANIES = [
  "BMW Financial",
  "KB캐피탈",
  "현대캐피탈",
  "하나캐피탈",
  "신한카드",
  "현금",
] as const;

export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0";

  return Number(value).toLocaleString("ko-KR");
}

export function currency(value: number | string | null | undefined) {
  return `${formatNumber(value)}원`;
}

export function calculateTotalPrice(
  vehiclePrice: number,
  optionPrice: number,
  discount: number,
  registrationFee: number
) {
  return vehiclePrice + optionPrice + registrationFee - discount;
}

export function calculateBalance(
  totalPrice: number,
  deposit: number
) {
  return totalPrice - deposit;
}

export function badgeColor(status: string) {
  switch (status) {
    case "계약 완료":
      return "bg-green-100 text-green-700";

    case "출고 준비":
      return "bg-yellow-100 text-yellow-700";

    case "출고 완료":
      return "bg-blue-100 text-blue-700";

    case "취소":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}