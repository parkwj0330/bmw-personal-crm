"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string;
  interested_model: string | null;
  birth_date: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  preferred_contact_channel: string | null;
  marketing_consent: boolean;
  night_marketing_consent: boolean;
};

type MessageTemplate = {
  id: string;
  template_name: string;
  template_key: string;
  message_type: string;
  channel: string;
  subject: string | null;
  content: string;
  requires_marketing_consent: boolean;
  requires_night_consent: boolean;
  is_active: boolean;
};

type OutboxMessage = {
  id: string;
  customer_id: string | null;
  template_id: string | null;
  channel: string;
  message_type: string;
  recipient_name: string | null;
  recipient_address: string;
  subject: string | null;
  content: string;
  status: string;
  requires_approval: boolean;
  approved_at: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  retry_count: number;
  provider: string | null;
  error_message: string | null;
  source: string;
  created_at: string;
};

type OutboxForm = {
  customerId: string;
  templateId: string;
  channel: string;
  messageType: string;
  recipientAddress: string;
  subject: string;
  content: string;
  scheduledAt: string;
  requiresApproval: boolean;
};

const initialForm: OutboxForm = {
  customerId: "",
  templateId: "",
  channel: "문자",
  messageType: "정보성",
  recipientAddress: "",
  subject: "",
  content: "",
  scheduledAt: "",
  requiresApproval: true,
};

export default function MessageOutbox() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messages, setMessages] = useState<OutboxMessage[]>([]);

  const [form, setForm] = useState<OutboxForm>(initialForm);
  const [statusFilter, setStatusFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingMessageId, setProcessingMessageId] =
    useState<string | null>(null);

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

    await Promise.all([
      loadCustomers(),
      loadTemplates(),
      loadMessages(),
    ]);

    setIsLoading(false);
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select(
        `
        id,
        name,
        phone,
        interested_model,
        birth_date,
        region_sido,
        region_sigungu,
        preferred_contact_channel,
        marketing_consent,
        night_marketing_consent
        `
      )
      .order("name", { ascending: true });

    if (error) {
      alert(
        `고객 정보를 불러오지 못했습니다.\n${error.message}`
      );
      return;
    }

    setCustomers((data as Customer[]) ?? []);
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("message_templates")
      .select(
        `
        id,
        template_name,
        template_key,
        message_type,
        channel,
        subject,
        content,
        requires_marketing_consent,
        requires_night_consent,
        is_active
        `
      )
      .eq("is_active", true)
      .order("template_name", { ascending: true });

    if (error) {
      alert(
        `메시지 템플릿을 불러오지 못했습니다.\n${error.message}`
      );
      return;
    }

    setTemplates((data as MessageTemplate[]) ?? []);
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("message_outbox")
      .select(
        `
        id,
        customer_id,
        template_id,
        channel,
        message_type,
        recipient_name,
        recipient_address,
        subject,
        content,
        status,
        requires_approval,
        approved_at,
        scheduled_at,
        sent_at,
        failed_at,
        cancelled_at,
        retry_count,
        provider,
        error_message,
        source,
        created_at
        `
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      alert(
        `발송 대기열을 불러오지 못했습니다.\n${error.message}`
      );
      return;
    }

    setMessages((data as OutboxMessage[]) ?? []);
  }

  function openRegistrationModal() {
    setForm(initialForm);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setForm(initialForm);
  }

  function updateForm<K extends keyof OutboxForm>(
    field: K,
    value: OutboxForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleCustomerChange(customerId: string) {
    const customer =
      customers.find((item) => item.id === customerId) ?? null;

    const template =
      templates.find((item) => item.id === form.templateId) ??
      null;

    const rendered = renderTemplate(template, customer);

    setForm((previous) => ({
      ...previous,
      customerId,
      recipientAddress: customer?.phone ?? "",
      channel:
        template?.channel ??
        customer?.preferred_contact_channel ??
        previous.channel,
      messageType:
        template?.message_type ?? previous.messageType,
      subject: template ? rendered.subject : previous.subject,
      content: template ? rendered.content : previous.content,
    }));
  }

  function handleTemplateChange(templateId: string) {
    const template =
      templates.find((item) => item.id === templateId) ?? null;

    const customer =
      customers.find((item) => item.id === form.customerId) ??
      null;

    const rendered = renderTemplate(template, customer);

    setForm((previous) => ({
      ...previous,
      templateId,
      channel: template?.channel ?? previous.channel,
      messageType:
        template?.message_type ?? previous.messageType,
      subject: rendered.subject,
      content: rendered.content,
      requiresApproval: true,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const customer =
      customers.find(
        (item) => item.id === form.customerId
      ) ?? null;

    const template =
      templates.find(
        (item) => item.id === form.templateId
      ) ?? null;

    if (!customer) {
      alert("메시지를 준비할 고객을 선택해주세요.");
      return;
    }

    if (!template) {
      alert("사용할 메시지 템플릿을 선택해주세요.");
      return;
    }

    if (!form.recipientAddress.trim()) {
      alert("수신 주소 또는 연락처를 입력해주세요.");
      return;
    }

    if (!form.content.trim()) {
      alert("메시지 내용을 입력해주세요.");
      return;
    }

    if (
      template.requires_marketing_consent &&
      !customer.marketing_consent
    ) {
      alert(
        "이 템플릿은 마케팅 수신동의가 필요한 메시지입니다.\n현재 고객은 마케팅 수신에 동의하지 않았습니다."
      );
      return;
    }

    if (
      template.requires_night_consent &&
      !customer.night_marketing_consent
    ) {
      alert(
        "이 템플릿은 야간 광고 수신동의가 필요합니다.\n현재 고객은 야간 광고 수신에 동의하지 않았습니다."
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

      alert(
        "로그인이 만료되었습니다. 다시 로그인해주세요."
      );

      router.replace("/login");
      return;
    }

    const initialStatus = form.requiresApproval
      ? "pending_approval"
      : "draft";

    const scheduledAt = form.scheduledAt
      ? new Date(form.scheduledAt).toISOString()
      : null;

    const { data, error } = await supabase
      .from("message_outbox")
      .insert({
        user_id: user.id,
        customer_id: customer.id,
        template_id: template.id,
        automation_rule_id: null,

        channel: form.channel,
        message_type: form.messageType,

        recipient_name: customer.name,
        recipient_address:
          form.recipientAddress.trim(),

        subject: form.subject.trim() || null,
        content: form.content.trim(),

        template_variables:
          createTemplateVariables(customer),

        status: initialStatus,
        requires_approval: form.requiresApproval,

        scheduled_at: scheduledAt,

        source: "manual",
        metadata: {
          template_key: template.template_key,
          prepared_from: "message_center",
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      setIsSaving(false);

      alert(
        `발송 대기열에 저장하지 못했습니다.\n${
          error?.message ??
          "생성된 메시지 ID를 확인할 수 없습니다."
        }`
      );

      return;
    }

    const { error: logError } = await supabase
      .from("message_logs")
      .insert({
        user_id: user.id,
        outbox_id: data.id,
        customer_id: customer.id,

        event_type: "created",
        status: initialStatus,
        channel: form.channel,

        message: "메시지가 발송 대기열에 등록되었습니다.",

        metadata: {
          template_id: template.id,
          template_key: template.template_key,
        },
      });

    setIsSaving(false);

    if (logError) {
      alert(
        `메시지는 준비되었지만 기록 저장에 실패했습니다.\n${logError.message}`
      );
    } else {
      alert(
        form.requiresApproval
          ? "메시지가 승인 대기 상태로 등록되었습니다."
          : "메시지 초안이 발송 대기열에 등록되었습니다."
      );
    }

    setForm(initialForm);
    setIsModalOpen(false);

    await loadMessages();
  }

  async function handleApprove(message: OutboxMessage) {
    if (message.status !== "pending_approval") {
      alert("승인 대기 중인 메시지만 승인할 수 있습니다.");
      return;
    }

    const shouldApprove = window.confirm(
      `${message.recipient_name ?? "고객"}에게 보낼 메시지를 승인하시겠습니까?\n아직 실제 발송은 실행되지 않습니다.`
    );

    if (!shouldApprove) {
      return;
    }

    setProcessingMessageId(message.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProcessingMessageId(null);
      router.replace("/login");
      return;
    }

    const hasFutureSchedule =
      message.scheduled_at &&
      new Date(message.scheduled_at).getTime() > Date.now();

    const nextStatus = hasFutureSchedule
      ? "scheduled"
      : "approved";

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("message_outbox")
      .update({
        status: nextStatus,
        approved_at: now,
        approved_by: user.id,
      })
      .eq("id", message.id)
      .eq("user_id", user.id);

    if (error) {
      setProcessingMessageId(null);

      alert(
        `메시지를 승인하지 못했습니다.\n${error.message}`
      );

      return;
    }

    await supabase.from("message_logs").insert({
      user_id: user.id,
      outbox_id: message.id,
      customer_id: message.customer_id,

      event_type: "approved",
      status: nextStatus,
      channel: message.channel,

      message:
        nextStatus === "scheduled"
          ? "관리자 승인 후 예약 상태로 변경되었습니다."
          : "관리자 승인이 완료되었습니다.",
    });

    setProcessingMessageId(null);
    await loadMessages();
  }

  async function handleCancel(message: OutboxMessage) {
    if (
      ["sent", "cancelled"].includes(message.status)
    ) {
      alert(
        "발송 완료 또는 취소된 메시지는 다시 취소할 수 없습니다."
      );
      return;
    }

    const shouldCancel = window.confirm(
      `${message.recipient_name ?? "고객"} 메시지를 취소하시겠습니까?`
    );

    if (!shouldCancel) {
      return;
    }

    setProcessingMessageId(message.id);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProcessingMessageId(null);
      router.replace("/login");
      return;
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("message_outbox")
      .update({
        status: "cancelled",
        cancelled_at: now,
      })
      .eq("id", message.id)
      .eq("user_id", user.id);

    if (error) {
      setProcessingMessageId(null);

      alert(
        `메시지를 취소하지 못했습니다.\n${error.message}`
      );

      return;
    }

    await supabase.from("message_logs").insert({
      user_id: user.id,
      outbox_id: message.id,
      customer_id: message.customer_id,

      event_type: "cancelled",
      status: "cancelled",
      channel: message.channel,

      message: "사용자가 메시지 발송을 취소했습니다.",
    });

    setProcessingMessageId(null);
    await loadMessages();
  }

  const filteredMessages = useMemo(() => {
    if (statusFilter === "전체") {
      return messages;
    }

    return messages.filter(
      (message) => message.status === statusFilter
    );
  }, [messages, statusFilter]);

  const pendingCount = messages.filter(
    (message) => message.status === "pending_approval"
  ).length;

  const approvedCount = messages.filter((message) =>
    ["approved", "scheduled", "queued"].includes(
      message.status
    )
  ).length;

  const sentCount = messages.filter(
    (message) => message.status === "sent"
  ).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            발송 대기열
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            고객과 템플릿을 선택해 메시지를 준비하고 승인
            상태를 관리합니다.
          </p>

          <p className="mt-2 text-xs font-semibold text-orange-600">
            현재 단계에서는 실제 문자나 카카오톡이 발송되지
            않습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={openRegistrationModal}
          className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + 고객 메시지 준비
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="전체 메시지"
          value={`${messages.length}건`}
        />

        <SummaryCard
          label="승인 대기"
          value={`${pendingCount}건`}
        />

        <SummaryCard
          label="승인·예약"
          value={`${approvedCount}건`}
        />

        <SummaryCard
          label="발송 완료"
          value={`${sentCount}건`}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold">메시지 목록</h3>

            <p className="mt-1 text-sm text-slate-500">
              최근 등록된 메시지를 최대 100건까지 표시합니다.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="전체">전체 상태</option>
            <option value="draft">초안</option>
            <option value="pending_approval">
              승인 대기
            </option>
            <option value="approved">승인 완료</option>
            <option value="scheduled">예약됨</option>
            <option value="queued">발송 대기</option>
            <option value="sending">발송 중</option>
            <option value="sent">발송 완료</option>
            <option value="failed">발송 실패</option>
            <option value="cancelled">취소</option>
          </select>
        </div>

        {isLoading ? (
          <div className="px-6 py-16 text-center text-slate-500">
            발송 대기열을 불러오는 중입니다.
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-slate-500">
              등록된 메시지가 없습니다.
            </p>

            <button
              type="button"
              onClick={openRegistrationModal}
              className="mt-4 text-sm font-semibold text-blue-700"
            >
              첫 고객 메시지 준비하기
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredMessages.map((message) => (
              <article
                key={message.id}
                className="p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">
                        {message.recipient_name ||
                          "수신자 이름 없음"}
                      </p>

                      <StatusBadge
                        status={message.status}
                      />

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {message.channel}
                      </span>

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {message.message_type}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      {message.recipient_address}
                    </p>

                    {message.subject && (
                      <p className="mt-4 text-sm font-bold">
                        {message.subject}
                      </p>
                    )}

                    <div className="mt-3 rounded-xl bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {message.content}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400">
                      <p>
                        등록{" "}
                        {formatDateTime(
                          message.created_at
                        )}
                      </p>

                      <p>
                        예약{" "}
                        {formatDateTime(
                          message.scheduled_at
                        )}
                      </p>

                      <p>
                        출처{" "}
                        {getSourceLabel(message.source)}
                      </p>
                    </div>

                    {message.error_message && (
                      <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                        {message.error_message}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                    {message.status ===
                      "pending_approval" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleApprove(message)
                        }
                        disabled={
                          processingMessageId ===
                          message.id
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {processingMessageId ===
                        message.id
                          ? "처리 중"
                          : "승인"}
                      </button>
                    )}

                    {!["sent", "cancelled"].includes(
                      message.status
                    ) && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCancel(message)
                        }
                        disabled={
                          processingMessageId ===
                          message.id
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
                  고객 메시지 준비
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  고객과 템플릿을 선택한 뒤 발송 전 내용을
                  검토합니다.
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
              className="space-y-6 p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="고객 선택 *">
                  <select
                    value={form.customerId}
                    onChange={(event) =>
                      handleCustomerChange(
                        event.target.value
                      )
                    }
                    className="input-style"
                  >
                    <option value="">고객 선택</option>

                    {customers.map((customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name} · {customer.phone}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="메시지 템플릿 *">
                  <select
                    value={form.templateId}
                    onChange={(event) =>
                      handleTemplateChange(
                        event.target.value
                      )
                    }
                    className="input-style"
                  >
                    <option value="">
                      템플릿 선택
                    </option>

                    {templates.map((template) => (
                      <option
                        key={template.id}
                        value={template.id}
                      >
                        {template.template_name} ·{" "}
                        {template.message_type}
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
                    <option value="이메일">
                      이메일
                    </option>
                  </select>
                </FormField>

                <FormField label="수신 주소·연락처 *">
                  <input
                    value={form.recipientAddress}
                    onChange={(event) =>
                      updateForm(
                        "recipientAddress",
                        event.target.value
                      )
                    }
                    className="input-style"
                    placeholder="010-1234-5678"
                  />
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="예약 일시">
                    <input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(event) =>
                        updateForm(
                          "scheduledAt",
                          event.target.value
                        )
                      }
                      className="input-style"
                    />
                  </FormField>
                </div>
              </div>

              <FormField label="메시지 제목">
                <input
                  value={form.subject}
                  onChange={(event) =>
                    updateForm(
                      "subject",
                      event.target.value
                    )
                  }
                  className="input-style"
                  placeholder="채널에서 제목을 지원할 때 사용합니다."
                />
              </FormField>

              <FormField label="메시지 내용 *">
                <textarea
                  value={form.content}
                  onChange={(event) =>
                    updateForm(
                      "content",
                      event.target.value
                    )
                  }
                  className="input-style min-h-52 resize-y"
                  placeholder="고객에게 보낼 메시지를 입력하세요."
                />
              </FormField>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={(event) =>
                    updateForm(
                      "requiresApproval",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block text-sm font-bold">
                    관리자 승인 필요
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    승인 버튼을 누르기 전까지 발송 준비 상태로
                    유지합니다.
                  </span>
                </span>
              </label>

              <div className="rounded-xl bg-orange-50 p-4 text-sm leading-6 text-orange-700">
                현재는 발송 대기열과 승인 상태만 관리합니다.
                실제 문자·카카오톡·텔레그램 API는 아직 연결되지
                않았습니다.
              </div>

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
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving
                    ? "저장 중..."
                    : "발송 대기열에 저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
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
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    draft: {
      label: "초안",
      className:
        "bg-slate-200 text-slate-600",
    },
    pending_approval: {
      label: "승인 대기",
      className:
        "bg-orange-100 text-orange-700",
    },
    approved: {
      label: "승인 완료",
      className:
        "bg-emerald-100 text-emerald-700",
    },
    scheduled: {
      label: "예약됨",
      className:
        "bg-blue-100 text-blue-700",
    },
    queued: {
      label: "발송 대기",
      className:
        "bg-violet-100 text-violet-700",
    },
    sending: {
      label: "발송 중",
      className:
        "bg-cyan-100 text-cyan-700",
    },
    sent: {
      label: "발송 완료",
      className:
        "bg-emerald-100 text-emerald-700",
    },
    failed: {
      label: "발송 실패",
      className:
        "bg-red-100 text-red-700",
    },
    cancelled: {
      label: "취소",
      className:
        "bg-slate-200 text-slate-500",
    },
  };

  const selected =
    config[status] ?? {
      label: status,
      className:
        "bg-slate-100 text-slate-600",
    };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.className}`}
    >
      {selected.label}
    </span>
  );
}

function renderTemplate(
  template: MessageTemplate | null,
  customer: Customer | null
) {
  if (!template) {
    return {
      subject: "",
      content: "",
    };
  }

  const variables = customer
    ? createTemplateVariables(customer)
    : {};

  return {
    subject: replaceVariables(
      template.subject ?? "",
      variables
    ),
    content: replaceVariables(
      template.content,
      variables
    ),
  };
}

function createTemplateVariables(
  customer: Customer
): Record<string, string> {
  const region = [
    customer.region_sido,
    customer.region_sigungu,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    customer_name: customer.name,
    customer_phone: customer.phone,
    vehicle_model:
      customer.interested_model ?? "",
    birth_date: customer.birth_date ?? "",
    region,
    preferred_contact_channel:
      customer.preferred_contact_channel ?? "",
  };
}

function replaceVariables(
  content: string,
  variables: Record<string, string>
) {
  return content.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (original, key: string) => {
      return key in variables
        ? variables[key]
        : original;
    }
  );
}

function getSourceLabel(source: string) {
  const labels: Record<string, string> = {
    manual: "수동 등록",
    automation: "자동화",
    agent: "AI 에이전트",
    telegram: "텔레그램",
    kakao: "카카오",
    system: "시스템",
  };

  return labels[source] ?? source;
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "미정";
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