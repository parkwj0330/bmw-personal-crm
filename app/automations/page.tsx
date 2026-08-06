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
import PageHeader from "../components/PageHeader";

type AutomationRule = {
  id: string;
  user_id: string;
  template_id: string | null;
  rule_key: string;
  rule_name: string;
  description: string | null;
  event_type: string;
  trigger_mode: string;
  channel: string;
  days_before: number;
  run_time: string;
  timezone: string;
  recurrence: string;
  weekday: number | null;
  day_of_month: number | null;
  filter_config: unknown;
  requires_approval: boolean;
  auto_send: boolean;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageTemplate = {
  id: string;
  template_name: string;
  template_key: string;
  category: string;
  message_type: string;
  channel: string;
  is_active: boolean;
};

type RuleForm = {
  ruleKey: string;
  ruleName: string;
  description: string;
  eventType: string;
  triggerMode: string;
  templateId: string;
  channel: string;
  daysBefore: string;
  runTime: string;
  timezone: string;
  recurrence: string;
  weekday: string;
  dayOfMonth: string;
  requiresApproval: boolean;
  autoSend: boolean;
  isActive: boolean;
};

function createInitialForm(): RuleForm {
  return {
    ruleKey: createRuleKey(),
    ruleName: "",
    description: "",
    eventType: "birthday",
    triggerMode: "date_event",
    templateId: "",
    channel: "문자",
    daysBefore: "0",
    runTime: "09:00",
    timezone: "Asia/Seoul",
    recurrence: "yearly",
    weekday: "",
    dayOfMonth: "",
    requiresApproval: true,
    autoSend: false,
    isActive: false,
  };
}

export default function AutomationsPage() {
  const router = useRouter();

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [form, setForm] = useState<RuleForm>(createInitialForm());

  const [editingRuleId, setEditingRuleId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingRuleId, setDeletingRuleId] = useState<
    string | null
  >(null);

  useEffect(() => {
    void checkLoginAndLoadData();
  }, []);

  async function checkLoginAndLoadData() {
    setIsLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/login");
      return;
    }

    await Promise.all([loadRules(), loadTemplates()]);
    setIsLoading(false);
  }

  async function loadRules() {
    const { data, error } = await supabase
      .from("automation_rules")
      .select(
        `
        id,
        user_id,
        template_id,
        rule_key,
        rule_name,
        description,
        event_type,
        trigger_mode,
        channel,
        days_before,
        run_time,
        timezone,
        recurrence,
        weekday,
        day_of_month,
        filter_config,
        requires_approval,
        auto_send,
        is_active,
        last_run_at,
        next_run_at,
        created_at,
        updated_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(
        `자동화 규칙을 불러오지 못했습니다.\n${error.message}`
      );
      return;
    }

    setRules((data as AutomationRule[]) ?? []);
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("message_templates")
      .select(
        `
        id,
        template_name,
        template_key,
        category,
        message_type,
        channel,
        is_active
        `
      )
      .order("template_name", { ascending: true });

    if (error) {
      alert(
        `메시지 템플릿을 불러오지 못했습니다.\n${error.message}`
      );
      return;
    }

    setTemplates((data as MessageTemplate[]) ?? []);
  }

  function openRegistrationModal() {
    setEditingRuleId(null);
    setForm(createInitialForm());
    setIsModalOpen(true);
  }

  function openEditModal(rule: AutomationRule) {
    setEditingRuleId(rule.id);

    setForm({
      ruleKey: rule.rule_key,
      ruleName: rule.rule_name,
      description: rule.description ?? "",
      eventType: rule.event_type,
      triggerMode: rule.trigger_mode,
      templateId: rule.template_id ?? "",
      channel: rule.channel,
      daysBefore: String(rule.days_before),
      runTime: normalizeTime(rule.run_time),
      timezone: rule.timezone,
      recurrence: rule.recurrence,
      weekday:
        rule.weekday === null ? "" : String(rule.weekday),
      dayOfMonth:
        rule.day_of_month === null
          ? ""
          : String(rule.day_of_month),
      requiresApproval: rule.requires_approval,
      autoSend: rule.auto_send,
      isActive: rule.is_active,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingRuleId(null);
    setForm(createInitialForm());
  }

  function updateForm<K extends keyof RuleForm>(
    field: K,
    value: RuleForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.ruleName.trim()) {
      alert("자동화 규칙 이름을 입력해주세요.");
      return;
    }

    if (!form.ruleKey.trim()) {
      alert("규칙 키를 입력해주세요.");
      return;
    }

    if (!isValidRuleKey(form.ruleKey)) {
      alert(
        "규칙 키는 영문 소문자, 숫자, 밑줄만 사용할 수 있습니다."
      );
      return;
    }

    const daysBefore = Number(form.daysBefore);

    if (
      !Number.isInteger(daysBefore) ||
      daysBefore < 0 ||
      daysBefore > 3650
    ) {
      alert("사전 실행일은 0일에서 3650일 사이로 입력해주세요.");
      return;
    }

    if (form.recurrence === "weekly" && form.weekday === "") {
      alert("매주 반복 규칙은 실행 요일을 선택해주세요.");
      return;
    }

    if (
      form.recurrence === "monthly" &&
      form.dayOfMonth === ""
    ) {
      alert("매월 반복 규칙은 실행 날짜를 선택해주세요.");
      return;
    }

    if (form.autoSend && form.requiresApproval) {
      alert(
        "관리자 승인과 자동 발송을 동시에 사용할 수 없습니다."
      );
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

    const ruleData = {
      rule_key: form.ruleKey.trim(),
      rule_name: form.ruleName.trim(),
      description: form.description.trim() || null,
      event_type: form.eventType,
      trigger_mode: form.triggerMode,
      template_id: form.templateId || null,
      channel: form.channel,
      days_before: daysBefore,
      run_time: form.runTime,
      timezone: form.timezone,
      recurrence: form.recurrence,

      weekday:
        form.recurrence === "weekly"
          ? Number(form.weekday)
          : null,

      day_of_month:
        form.recurrence === "monthly"
          ? Number(form.dayOfMonth)
          : null,

      filter_config: {},
      requires_approval: form.requiresApproval,
      auto_send: form.autoSend,
      is_active: form.isActive,
    };

    if (editingRuleId) {
      const { error } = await supabase
        .from("automation_rules")
        .update(ruleData)
        .eq("id", editingRuleId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(
          `자동화 규칙을 수정하지 못했습니다.\n${error.message}`
        );
        return;
      }

      alert("자동화 규칙이 수정되었습니다.");
    } else {
      const { error } = await supabase
        .from("automation_rules")
        .insert({
          ...ruleData,
          user_id: user.id,
        });

      setIsSaving(false);

      if (error) {
        if (error.code === "23505") {
          alert(
            "이미 사용 중인 규칙 키입니다. 다른 키를 입력해주세요."
          );
        } else {
          alert(
            `자동화 규칙을 저장하지 못했습니다.\n${error.message}`
          );
        }

        return;
      }

      alert("자동화 규칙이 등록되었습니다.");
    }

    setEditingRuleId(null);
    setForm(createInitialForm());
    setIsModalOpen(false);

    await loadRules();
  }

  async function handleToggleActive(rule: AutomationRule) {
    const nextActive = !rule.is_active;

    if (nextActive && !rule.template_id) {
      alert(
        "활성화하기 전에 사용할 메시지 템플릿을 연결해주세요."
      );
      return;
    }

    const { error } = await supabase
      .from("automation_rules")
      .update({
        is_active: nextActive,
      })
      .eq("id", rule.id);

    if (error) {
      alert(
        `자동화 상태를 변경하지 못했습니다.\n${error.message}`
      );
      return;
    }

    await loadRules();
  }

  async function handleDelete(rule: AutomationRule) {
    const shouldDelete = window.confirm(
      `"${rule.rule_name}" 자동화 규칙을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingRuleId(rule.id);

    const { error } = await supabase
      .from("automation_rules")
      .delete()
      .eq("id", rule.id);

    setDeletingRuleId(null);

    if (error) {
      alert(
        `자동화 규칙을 삭제하지 못했습니다.\n${error.message}`
      );
      return;
    }

    alert("자동화 규칙이 삭제되었습니다.");
    await loadRules();
  }

  const filteredRules = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const searchableText = [
        rule.rule_name,
        rule.rule_key,
        rule.description,
        rule.event_type,
        rule.channel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" || searchableText.includes(keyword);

      const matchesEvent =
        eventFilter === "전체" ||
        rule.event_type === eventFilter;

      return matchesSearch && matchesEvent;
    });
  }, [rules, search, eventFilter]);

  const activeCount = rules.filter(
    (rule) => rule.is_active
  ).length;

  const approvalCount = rules.filter(
    (rule) => rule.requires_approval
  ).length;

  const autoSendCount = rules.filter(
    (rule) => rule.auto_send
  ).length;

  function findTemplate(templateId: string | null) {
    if (!templateId) {
      return null;
    }

    return (
      templates.find(
        (template) => template.id === templateId
      ) ?? null
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="BMW AUTOMATION"
          title="자동화 센터"
          description="고객 생일, 출고기념일, 금융 만기와 재연락 자동화 규칙을 관리합니다."
          action={
            <button
              type="button"
              onClick={openRegistrationModal}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + 자동화 규칙 등록
            </button>
          }
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="전체 규칙"
            value={`${rules.length}개`}
          />

          <SummaryCard
            label="활성 규칙"
            value={`${activeCount}개`}
          />

          <SummaryCard
            label="승인 필요"
            value={`${approvalCount}개`}
          />

          <SummaryCard
            label="자동 발송"
            value={`${autoSendCount}개`}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="규칙 이름, 키 또는 설명 검색"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <select
              value={eventFilter}
              onChange={(event) =>
                setEventFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value="전체">전체 자동화</option>
              <option value="birthday">생일</option>
              <option value="delivery_anniversary">
                출고기념일
              </option>
              <option value="finance_maturity">
                금융 만기
              </option>
              <option value="follow_up">재연락</option>
              <option value="custom">사용자 정의</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="font-bold">자동화 규칙</h2>

              <p className="mt-1 text-sm text-slate-500">
                현재 단계에서는 규칙만 저장하며 실제 발송은 실행하지
                않습니다.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {filteredRules.length}개
            </p>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-slate-500">
              자동화 규칙을 불러오는 중입니다.
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-500">
                등록된 자동화 규칙이 없습니다.
              </p>

              <button
                type="button"
                onClick={openRegistrationModal}
                className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-500"
              >
                첫 자동화 규칙 등록하기
              </button>
            </div>
          ) : (
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              {filteredRules.map((rule) => {
                const template = findTemplate(rule.template_id);

                return (
                  <article
                    key={rule.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <EventTypeBadge
                            eventType={rule.event_type}
                          />

                          <ActiveBadge active={rule.is_active} />

                          <ExecutionBadge
                            requiresApproval={
                              rule.requires_approval
                            }
                            autoSend={rule.auto_send}
                          />
                        </div>

                        <h3 className="mt-3 text-lg font-bold">
                          {rule.rule_name}
                        </h3>

                        <p className="mt-1 break-all text-xs text-slate-400">
                          {rule.rule_key}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        {rule.channel}
                      </span>
                    </div>

                    {rule.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {rule.description}
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                      <RuleInfo
                        label="실행 기준"
                        value={getEventTypeLabel(rule.event_type)}
                      />

                      <RuleInfo
                        label="사전 실행"
                        value={`${rule.days_before}일 전`}
                      />

                      <RuleInfo
                        label="실행 시간"
                        value={normalizeTime(rule.run_time)}
                      />

                      <RuleInfo
                        label="반복 방식"
                        value={getRecurrenceLabel(
                          rule.recurrence,
                          rule.weekday,
                          rule.day_of_month
                        )}
                      />
                    </div>

                    <div className="mt-5">
                      <p className="text-xs text-slate-400">
                        연결된 메시지 템플릿
                      </p>

                      <p
                        className={`mt-2 text-sm font-semibold ${
                          template
                            ? "text-slate-800"
                            : "text-red-500"
                        }`}
                      >
                        {template
                          ? `${template.template_name} · ${template.message_type}`
                          : "연결된 템플릿 없음"}
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <RuleInfo
                        label="최근 실행"
                        value={formatDateTime(rule.last_run_at)}
                      />

                      <RuleInfo
                        label="다음 실행"
                        value={formatDateTime(rule.next_run_at)}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(rule)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        {rule.is_active ? "비활성화" : "활성화"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(rule)}
                        disabled={deletingRuleId === rule.id}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingRuleId === rule.id
                          ? "삭제 중"
                          : "삭제"}
                      </button>
                    </div>
                  </article>
                );
              })}
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingRuleId
                    ? "자동화 규칙 수정"
                    : "자동화 규칙 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  자동 실행 조건과 사용할 메시지 템플릿을
                  설정합니다.
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

            <form
              onSubmit={handleSubmit}
              className="space-y-7 p-6"
            >
              <section>
                <h3 className="font-bold">규칙 기본 정보</h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="규칙 이름 *">
                    <input
                      value={form.ruleName}
                      onChange={(event) =>
                        updateForm("ruleName", event.target.value)
                      }
                      className="input-style"
                      placeholder="고객 생일 7일 전 안내"
                      autoFocus
                    />
                  </FormField>

                  <FormField label="규칙 키 *">
                    <input
                      value={form.ruleKey}
                      onChange={(event) =>
                        updateForm(
                          "ruleKey",
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "")
                        )
                      }
                      className="input-style"
                      placeholder="birthday_7days"
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField label="설명">
                      <input
                        value={form.description}
                        onChange={(event) =>
                          updateForm(
                            "description",
                            event.target.value
                          )
                        }
                        className="input-style"
                        placeholder="생일이 7일 남은 고객에게 축하 메시지를 준비합니다."
                      />
                    </FormField>
                  </div>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <h3 className="font-bold">실행 조건</h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="자동화 유형">
                    <select
                      value={form.eventType}
                      onChange={(event) =>
                        updateForm(
                          "eventType",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="birthday">고객 생일</option>
                      <option value="delivery_anniversary">
                        출고기념일
                      </option>
                      <option value="finance_maturity">
                        금융 만기
                      </option>
                      <option value="follow_up">재연락</option>
                      <option value="custom">
                        사용자 정의
                      </option>
                    </select>
                  </FormField>

                  <FormField label="실행 기준">
                    <select
                      value={form.triggerMode}
                      onChange={(event) =>
                        updateForm(
                          "triggerMode",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="date_event">
                        고객 날짜 정보 기준
                      </option>
                      <option value="schedule">
                        고정 일정 기준
                      </option>
                      <option value="manual">
                        관리자 수동 실행
                      </option>
                    </select>
                  </FormField>

                  <FormField label="기준일 며칠 전">
                    <input
                      type="number"
                      min="0"
                      max="3650"
                      value={form.daysBefore}
                      onChange={(event) =>
                        updateForm(
                          "daysBefore",
                          event.target.value
                        )
                      }
                      className="input-style"
                    />
                  </FormField>

                  <FormField label="실행 시간">
                    <input
                      type="time"
                      value={form.runTime}
                      onChange={(event) =>
                        updateForm(
                          "runTime",
                          event.target.value
                        )
                      }
                      className="input-style"
                    />
                  </FormField>

                  <FormField label="반복 방식">
                    <select
                      value={form.recurrence}
                      onChange={(event) => {
                        const recurrence =
                          event.target.value;

                        updateForm(
                          "recurrence",
                          recurrence
                        );

                        if (recurrence !== "weekly") {
                          updateForm("weekday", "");
                        }

                        if (recurrence !== "monthly") {
                          updateForm("dayOfMonth", "");
                        }
                      }}
                      className="input-style"
                    >
                      <option value="once">한 번만</option>
                      <option value="yearly">매년</option>
                      <option value="monthly">매월</option>
                      <option value="weekly">매주</option>
                    </select>
                  </FormField>

                  <FormField label="시간대">
                    <select
                      value={form.timezone}
                      onChange={(event) =>
                        updateForm(
                          "timezone",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="Asia/Seoul">
                        대한민국 · Asia/Seoul
                      </option>
                    </select>
                  </FormField>

                  {form.recurrence === "weekly" && (
                    <FormField label="실행 요일">
                      <select
                        value={form.weekday}
                        onChange={(event) =>
                          updateForm(
                            "weekday",
                            event.target.value
                          )
                        }
                        className="input-style"
                      >
                        <option value="">요일 선택</option>
                        <option value="0">일요일</option>
                        <option value="1">월요일</option>
                        <option value="2">화요일</option>
                        <option value="3">수요일</option>
                        <option value="4">목요일</option>
                        <option value="5">금요일</option>
                        <option value="6">토요일</option>
                      </select>
                    </FormField>
                  )}

                  {form.recurrence === "monthly" && (
                    <FormField label="매월 실행일">
                      <select
                        value={form.dayOfMonth}
                        onChange={(event) =>
                          updateForm(
                            "dayOfMonth",
                            event.target.value
                          )
                        }
                        className="input-style"
                      >
                        <option value="">날짜 선택</option>

                        {Array.from(
                          { length: 31 },
                          (_, index) => index + 1
                        ).map((day) => (
                          <option key={day} value={day}>
                            매월 {day}일
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <h3 className="font-bold">
                  메시지 및 발송 방식
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="메시지 템플릿">
                    <select
                      value={form.templateId}
                      onChange={(event) => {
                        const templateId =
                          event.target.value;

                        updateForm(
                          "templateId",
                          templateId
                        );

                        const selectedTemplate =
                          templates.find(
                            (template) =>
                              template.id === templateId
                          );

                        if (selectedTemplate) {
                          updateForm(
                            "channel",
                            selectedTemplate.channel
                          );
                        }
                      }}
                      className="input-style"
                    >
                      <option value="">
                        템플릿 선택
                      </option>

                      {templates.map((template) => (
                        <option
                          key={template.id}
                          value={template.id}
                          disabled={!template.is_active}
                        >
                          {template.template_name}
                          {!template.is_active
                            ? " · 비활성"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="발송 채널">
                    <select
                      value={form.channel}
                      onChange={(event) =>
                        updateForm(
                          "channel",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="문자">문자</option>
                      <option value="카카오톡">
                        카카오톡
                      </option>
                      <option value="텔레그램">
                        텔레그램
                      </option>
                      <option value="이메일">이메일</option>
                    </select>
                  </FormField>
                </div>

                <div className="mt-4 space-y-3">
                  <CheckboxField
                    checked={form.requiresApproval}
                    title="관리자 승인 후 실행"
                    description="자동화 조건이 충족돼도 사용자가 승인하기 전에는 발송하지 않습니다."
                    onChange={(checked) => {
                      updateForm(
                        "requiresApproval",
                        checked
                      );

                      if (checked) {
                        updateForm("autoSend", false);
                      }
                    }}
                  />

                  <CheckboxField
                    checked={form.autoSend}
                    title="조건 충족 시 자동 발송"
                    description="관리자 승인 없이 자동으로 발송하는 설정입니다. 실제 발송 엔진 연결 전에는 실행되지 않습니다."
                    onChange={(checked) => {
                      updateForm("autoSend", checked);

                      if (checked) {
                        updateForm(
                          "requiresApproval",
                          false
                        );
                      }
                    }}
                  />

                  <CheckboxField
                    checked={form.isActive}
                    title="자동화 규칙 활성화"
                    description="활성화된 규칙만 향후 자동화 엔진의 검사 대상이 됩니다."
                    onChange={(checked) =>
                      updateForm("isActive", checked)
                    }
                  />
                </div>
              </section>

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
                    : editingRuleId
                      ? "수정 저장"
                      : "규칙 저장"}
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

function CheckboxField({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block text-sm font-bold text-slate-800">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function RuleInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EventTypeBadge({
  eventType,
}: {
  eventType: string;
}) {
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {getEventTypeLabel(eventType)}
    </span>
  );
}

function ActiveBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? "활성" : "비활성"}
    </span>
  );
}

function ExecutionBadge({
  requiresApproval,
  autoSend,
}: {
  requiresApproval: boolean;
  autoSend: boolean;
}) {
  const label = autoSend
    ? "자동 발송"
    : requiresApproval
      ? "승인 필요"
      : "수동 실행";

  const className = autoSend
    ? "bg-orange-100 text-orange-700"
    : requiresApproval
      ? "bg-violet-100 text-violet-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function getEventTypeLabel(eventType: string) {
  const labels: Record<string, string> = {
    birthday: "고객 생일",
    delivery_anniversary: "출고기념일",
    finance_maturity: "금융 만기",
    follow_up: "재연락",
    custom: "사용자 정의",
  };

  return labels[eventType] ?? eventType;
}

function getRecurrenceLabel(
  recurrence: string,
  weekday: number | null,
  dayOfMonth: number | null
) {
  if (recurrence === "yearly") {
    return "매년";
  }

  if (recurrence === "monthly") {
    return dayOfMonth
      ? `매월 ${dayOfMonth}일`
      : "매월";
  }

  if (recurrence === "weekly") {
    const weekdays = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ];

    return weekday !== null
      ? `매주 ${weekdays[weekday]}`
      : "매주";
  }

  return "한 번만";
}

function normalizeTime(time: string) {
  return time ? time.slice(0, 5) : "09:00";
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "아직 없음";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "날짜 확인 필요";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsedDate);
}

function isValidRuleKey(value: string) {
  return /^[a-z0-9_]+$/.test(value);
}

function createRuleKey() {
  const datePart = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 6);

  return `rule_${datePart}_${randomPart}`;
}