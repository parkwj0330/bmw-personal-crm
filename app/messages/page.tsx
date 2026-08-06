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

type MessageTemplate = {
  id: string;
  user_id: string;
  template_key: string;
  template_name: string;
  category: string;
  message_type: string;
  channel: string;
  subject: string | null;
  content: string;
  variables: unknown;
  requires_marketing_consent: boolean;
  requires_night_consent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type TemplateForm = {
  templateKey: string;
  templateName: string;
  category: string;
  messageType: string;
  channel: string;
  subject: string;
  content: string;
  variables: string;
  requiresMarketingConsent: boolean;
  requiresNightConsent: boolean;
  isActive: boolean;
};

function createInitialForm(): TemplateForm {
  return {
    templateKey: createTemplateKey(),
    templateName: "",
    category: "custom",
    messageType: "정보성",
    channel: "문자",
    subject: "",
    content: "",
    variables: "customer_name",
    requiresMarketingConsent: false,
    requiresNightConsent: false,
    isActive: true,
  };
}

export default function MessagesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [form, setForm] = useState<TemplateForm>(createInitialForm());

  const [editingTemplateId, setEditingTemplateId] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingTemplateId, setDeletingTemplateId] = useState<
    string | null
  >(null);

  useEffect(() => {
    void checkLoginAndLoadTemplates();
  }, []);

  async function checkLoginAndLoadTemplates() {
    setIsLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/login");
      return;
    }

    await loadTemplates();
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("message_templates")
      .select(
        `
        id,
        user_id,
        template_key,
        template_name,
        category,
        message_type,
        channel,
        subject,
        content,
        variables,
        requires_marketing_consent,
        requires_night_consent,
        is_active,
        created_at,
        updated_at
        `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(
        `메시지 템플릿을 불러오지 못했습니다.\n${error.message}`
      );

      setIsLoading(false);
      return;
    }

    setTemplates((data as MessageTemplate[]) ?? []);
    setIsLoading(false);
  }

  function openRegistrationModal() {
    setEditingTemplateId(null);
    setForm(createInitialForm());
    setIsModalOpen(true);
  }

  function openEditModal(template: MessageTemplate) {
    setEditingTemplateId(template.id);

    setForm({
      templateKey: template.template_key,
      templateName: template.template_name,
      category: template.category,
      messageType: template.message_type,
      channel: template.channel,
      subject: template.subject ?? "",
      content: template.content,
      variables: normalizeVariables(template.variables).join(", "),
      requiresMarketingConsent:
        template.requires_marketing_consent,
      requiresNightConsent: template.requires_night_consent,
      isActive: template.is_active,
    });

    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingTemplateId(null);
    setForm(createInitialForm());
  }

  function updateForm<K extends keyof TemplateForm>(
    field: K,
    value: TemplateForm[K]
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

    if (!form.templateName.trim()) {
      alert("템플릿 이름을 입력해주세요.");
      return;
    }

    if (!form.templateKey.trim()) {
      alert("템플릿 키를 입력해주세요.");
      return;
    }

    if (!isValidTemplateKey(form.templateKey)) {
      alert(
        "템플릿 키는 영문 소문자, 숫자, 밑줄만 사용할 수 있습니다."
      );
      return;
    }

    if (!form.content.trim()) {
      alert("메시지 내용을 입력해주세요.");
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

    const requiresMarketingConsent =
      form.messageType === "광고성" ||
      form.requiresMarketingConsent ||
      form.requiresNightConsent;

    const templateData = {
      template_key: form.templateKey.trim(),
      template_name: form.templateName.trim(),
      category: form.category,
      message_type: form.messageType,
      channel: form.channel,
      subject: form.subject.trim() || null,
      content: form.content.trim(),
      variables: parseVariables(form.variables),
      requires_marketing_consent: requiresMarketingConsent,
      requires_night_consent: form.requiresNightConsent,
      is_active: form.isActive,
    };

    if (editingTemplateId) {
      const { error } = await supabase
        .from("message_templates")
        .update(templateData)
        .eq("id", editingTemplateId)
        .eq("user_id", user.id);

      setIsSaving(false);

      if (error) {
        alert(
          `메시지 템플릿을 수정하지 못했습니다.\n${error.message}`
        );

        return;
      }

      alert("메시지 템플릿이 수정되었습니다.");
    } else {
      const { error } = await supabase
        .from("message_templates")
        .insert({
          ...templateData,
          user_id: user.id,
        });

      setIsSaving(false);

      if (error) {
        if (error.code === "23505") {
          alert(
            "이미 사용 중인 템플릿 키입니다. 다른 키를 입력해주세요."
          );
        } else {
          alert(
            `메시지 템플릿을 저장하지 못했습니다.\n${error.message}`
          );
        }

        return;
      }

      alert("메시지 템플릿이 등록되었습니다.");
    }

    setEditingTemplateId(null);
    setForm(createInitialForm());
    setIsModalOpen(false);

    await loadTemplates();
  }

  async function handleToggleActive(template: MessageTemplate) {
    const { error } = await supabase
      .from("message_templates")
      .update({
        is_active: !template.is_active,
      })
      .eq("id", template.id);

    if (error) {
      alert(
        `템플릿 상태를 변경하지 못했습니다.\n${error.message}`
      );

      return;
    }

    await loadTemplates();
  }

  async function handleDelete(template: MessageTemplate) {
    const shouldDelete = window.confirm(
      `"${template.template_name}" 템플릿을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingTemplateId(template.id);

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("id", template.id);

    setDeletingTemplateId(null);

    if (error) {
      alert(
        `메시지 템플릿을 삭제하지 못했습니다.\n${error.message}`
      );

      return;
    }

    alert("메시지 템플릿이 삭제되었습니다.");
    await loadTemplates();
  }

  const filteredTemplates = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return templates.filter((template) => {
      const searchableText = [
        template.template_name,
        template.template_key,
        template.content,
        template.category,
        template.channel,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        keyword === "" || searchableText.includes(keyword);

      const matchesCategory =
        categoryFilter === "전체" ||
        template.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [templates, search, categoryFilter]);

  const activeCount = templates.filter(
    (template) => template.is_active
  ).length;

  const informationCount = templates.filter(
    (template) => template.message_type === "정보성"
  ).length;

  const marketingCount = templates.filter(
    (template) => template.message_type === "광고성"
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="BMW AUTOMATION"
          title="메시지 센터"
          description="생일, 출고기념일, 금융 만기와 고객 안내에 사용할 메시지 템플릿을 관리합니다."
          action={
            <button
              type="button"
              onClick={openRegistrationModal}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              + 메시지 템플릿 등록
            </button>
          }
        />

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="전체 템플릿"
            value={`${templates.length}개`}
          />

          <SummaryCard
            label="활성 템플릿"
            value={`${activeCount}개`}
          />

          <SummaryCard
            label="정보성 메시지"
            value={`${informationCount}개`}
          />

          <SummaryCard
            label="광고성 메시지"
            value={`${marketingCount}개`}
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="템플릿 이름, 키 또는 메시지 검색"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
            />

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
            >
              <option value="전체">전체 분류</option>
              <option value="birthday">생일</option>
              <option value="delivery_anniversary">
                출고기념일
              </option>
              <option value="finance_maturity">
                금융 만기
              </option>
              <option value="vehicle_interest">
                관심 차종
              </option>
              <option value="follow_up">재연락</option>
              <option value="custom">사용자 정의</option>
            </select>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="font-bold">메시지 템플릿</h2>

              <p className="mt-1 text-sm text-slate-500">
                자동화 규칙에서 사용할 메시지 내용을 관리합니다.
              </p>
            </div>

            <p className="text-sm text-slate-500">
              {filteredTemplates.length}개
            </p>
          </div>

          {isLoading ? (
            <div className="px-6 py-16 text-center text-slate-500">
              메시지 템플릿을 불러오는 중입니다.
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-slate-500">
                등록된 메시지 템플릿이 없습니다.
              </p>

              <button
                type="button"
                onClick={openRegistrationModal}
                className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-500"
              >
                첫 메시지 템플릿 등록하기
              </button>
            </div>
          ) : (
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              {filteredTemplates.map((template) => {
                const variables = normalizeVariables(
                  template.variables
                );

                return (
                  <article
                    key={template.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge
                            category={template.category}
                          />

                          <MessageTypeBadge
                            type={template.message_type}
                          />

                          <ActiveBadge
                            active={template.is_active}
                          />
                        </div>

                        <h3 className="mt-3 text-lg font-bold">
                          {template.template_name}
                        </h3>

                        <p className="mt-1 break-all text-xs text-slate-400">
                          {template.template_key}
                        </p>
                      </div>

                      <p className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        {template.channel}
                      </p>
                    </div>

                    {template.subject && (
                      <div className="mt-5">
                        <p className="text-xs text-slate-400">
                          제목
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {template.subject}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                        {template.content}
                      </p>
                    </div>

                    {variables.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-400">
                          사용 변수
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {variables.map((variable) => (
                            <span
                              key={variable}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                            >
                              {"{{"}
                              {variable}
                              {"}}"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {template.requires_marketing_consent && (
                        <RequirementBadge text="마케팅 동의 필요" />
                      )}

                      {template.requires_night_consent && (
                        <RequirementBadge text="야간 동의 필요" />
                      )}

                      {!template.requires_marketing_consent &&
                        !template.requires_night_consent && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            별도 동의 조건 없음
                          </span>
                        )}
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleActive(template)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        {template.is_active
                          ? "비활성화"
                          : "활성화"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(template)}
                        disabled={
                          deletingTemplateId === template.id
                        }
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingTemplateId === template.id
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
                  {editingTemplateId
                    ? "메시지 템플릿 수정"
                    : "메시지 템플릿 등록"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  자동화에 사용할 메시지 내용과 발송 조건을
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
                <h3 className="font-bold">기본 정보</h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField label="템플릿 이름 *">
                    <input
                      value={form.templateName}
                      onChange={(event) =>
                        updateForm(
                          "templateName",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="생일 축하 메시지"
                      autoFocus
                    />
                  </FormField>

                  <FormField label="템플릿 키 *">
                    <input
                      value={form.templateKey}
                      onChange={(event) =>
                        updateForm(
                          "templateKey",
                          event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "")
                        )
                      }
                      className="input-style"
                      placeholder="birthday_default"
                    />
                  </FormField>

                  <FormField label="메시지 분류">
                    <select
                      value={form.category}
                      onChange={(event) =>
                        updateForm(
                          "category",
                          event.target.value
                        )
                      }
                      className="input-style"
                    >
                      <option value="birthday">생일</option>
                      <option value="delivery_anniversary">
                        출고기념일
                      </option>
                      <option value="finance_maturity">
                        금융 만기
                      </option>
                      <option value="vehicle_interest">
                        관심 차종
                      </option>
                      <option value="follow_up">
                        재연락
                      </option>
                      <option value="custom">
                        사용자 정의
                      </option>
                    </select>
                  </FormField>

                  <FormField label="메시지 유형">
                    <select
                      value={form.messageType}
                      onChange={(event) => {
                        const value = event.target.value;

                        updateForm("messageType", value);

                        if (value === "광고성") {
                          updateForm(
                            "requiresMarketingConsent",
                            true
                          );
                        }
                      }}
                      className="input-style"
                    >
                      <option value="정보성">정보성</option>
                      <option value="광고성">광고성</option>
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

                  <FormField label="활성 상태">
                    <select
                      value={form.isActive ? "active" : "inactive"}
                      onChange={(event) =>
                        updateForm(
                          "isActive",
                          event.target.value === "active"
                        )
                      }
                      className="input-style"
                    >
                      <option value="active">활성</option>
                      <option value="inactive">비활성</option>
                    </select>
                  </FormField>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <h3 className="font-bold">메시지 내용</h3>

                <div className="mt-4 space-y-4">
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
                      className="input-style min-h-48 resize-y"
                      placeholder={`안녕하세요, {{customer_name}} 고객님.\nBMW 평택전시장입니다.`}
                    />
                  </FormField>

                  <FormField label="사용 변수">
                    <input
                      value={form.variables}
                      onChange={(event) =>
                        updateForm(
                          "variables",
                          event.target.value
                        )
                      }
                      className="input-style"
                      placeholder="customer_name, vehicle_model, delivery_date"
                    />
                  </FormField>

                  <p className="text-xs leading-5 text-slate-500">
                    변수는 쉼표로 구분합니다. 메시지에서는
                    {" {{customer_name}} "}처럼 작성합니다.
                  </p>
                </div>
              </section>

              <section className="border-t border-slate-200 pt-7">
                <h3 className="font-bold">발송 조건</h3>

                <div className="mt-4 space-y-3">
                  <CheckboxField
                    checked={
                      form.requiresMarketingConsent ||
                      form.messageType === "광고성"
                    }
                    disabled={form.messageType === "광고성"}
                    title="마케팅 수신동의 필요"
                    description="동의한 고객에게만 이 템플릿을 사용할 수 있습니다."
                    onChange={(checked) => {
                      updateForm(
                        "requiresMarketingConsent",
                        checked
                      );

                      if (!checked) {
                        updateForm(
                          "requiresNightConsent",
                          false
                        );
                      }
                    }}
                  />

                  <CheckboxField
                    checked={form.requiresNightConsent}
                    title="야간 광고 수신동의 필요"
                    description="야간 발송에 대한 별도 동의가 있는 고객만 대상으로 합니다."
                    onChange={(checked) => {
                      updateForm(
                        "requiresNightConsent",
                        checked
                      );

                      if (checked) {
                        updateForm(
                          "requiresMarketingConsent",
                          true
                        );
                      }
                    }}
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
                    : editingTemplateId
                      ? "수정 저장"
                      : "템플릿 저장"}
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
  disabled = false,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border border-slate-200 p-4 ${
        disabled
          ? "cursor-not-allowed bg-slate-50 opacity-70"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
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

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    birthday: "생일",
    delivery_anniversary: "출고기념일",
    finance_maturity: "금융 만기",
    vehicle_interest: "관심 차종",
    follow_up: "재연락",
    custom: "사용자 정의",
  };

  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {labels[category] ?? category}
    </span>
  );
}

function MessageTypeBadge({ type }: { type: string }) {
  const className =
    type === "광고성"
      ? "bg-orange-100 text-orange-700"
      : "bg-emerald-100 text-emerald-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {type}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-violet-100 text-violet-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? "활성" : "비활성"}
    </span>
  );
}

function RequirementBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
      {text}
    </span>
  );
}

function parseVariables(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeVariables(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string"
  );
}

function isValidTemplateKey(value: string) {
  return /^[a-z0-9_]+$/.test(value);
}

function createTemplateKey() {
  const datePart = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 6);

  return `template_${datePart}_${randomPart}`;
}