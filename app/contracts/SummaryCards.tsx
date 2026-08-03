type SummaryCardsProps = {
  totalCount: number;
  progressingCount: number;
  completedCount: number;
  totalContractAmount: number;
};

export default function SummaryCards({
  totalCount,
  progressingCount,
  completedCount,
  totalContractAmount,
}: SummaryCardsProps) {
  const summaryItems = [
    {
      label: "전체 계약",
      value: `${totalCount}건`,
      description: "등록된 전체 계약",
    },
    {
      label: "계약 진행",
      value: `${progressingCount}건`,
      description: "현재 진행 중인 계약",
    },
    {
      label: "계약 완료",
      value: `${completedCount}건`,
      description: "계약 완료 및 출고 단계",
    },
    {
      label: "계약 총액",
      value: `${Math.round(totalContractAmount).toLocaleString("ko-KR")}원`,
      description: "할인 반영 총 계약금액",
    },
  ];

  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryItems.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">
            {item.label}
          </p>

          <p className="mt-3 break-words text-2xl font-bold text-slate-900">
            {item.value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {item.description}
          </p>
        </article>
      ))}
    </section>
  );
}