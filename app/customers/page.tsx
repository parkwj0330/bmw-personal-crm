export default function CustomersPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-blue-700">
              BMW PERSONAL CRM
            </p>

            <h1 className="mt-2 text-3xl font-bold">고객 관리</h1>

            <p className="mt-2 text-sm text-slate-500">
              상담 고객의 정보와 진행 상태를 관리합니다.
            </p>
          </div>

          <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
            + 신규 고객 등록
          </button>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="고객명 또는 연락처 검색"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            />

            <select className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500">
              <option>전체 상태</option>
              <option>신규</option>
              <option>상담 중</option>
              <option>견적 발송</option>
              <option>시승 예정</option>
              <option>계약 예정</option>
              <option>보류</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="font-bold">고객 목록</h2>
          </div>

          <div className="px-6 py-16 text-center">
            <p className="text-slate-500">아직 등록된 고객이 없습니다.</p>
            <p className="mt-2 text-sm text-slate-400">
              신규 고객 등록 버튼을 눌러 첫 고객을 추가해보세요.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}