"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type CustomerFile = {
  id: string;
  user_id: string;
  customer_id: string;
  storage_path: string;
  original_name: string;
  file_type: string;
  mime_type: string | null;
  file_size: number;
  memo: string | null;
  created_at: string;
};

type CustomerFilesProps = {
  customerId: string;
  customerName: string;
};

const BUCKET_NAME = "customer-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "application/pdf",
];

const fileTypeOptions = [
  "견적서",
  "계약서",
  "출고 사진",
  "보험 서류",
  "차량등록증",
  "신분증",
  "기타",
];

export default function CustomerFiles({
  customerId,
  customerName,
}: CustomerFilesProps) {
  const [files, setFiles] = useState<CustomerFile[]>([]);
  const [selectedType, setSelectedType] = useState("견적서");
  const [fileMemo, setFileMemo] = useState("");
  const [typeFilter, setTypeFilter] = useState("전체");

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<CustomerFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    void loadFiles();
  }, [customerId]);

  async function loadFiles() {
    setIsLoading(true);

    const { data, error } = await supabase
      .from("customer_files")
      .select(
        "id, user_id, customer_id, storage_path, original_name, file_type, mime_type, file_size, memo, created_at"
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      alert(`파일 목록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setFiles((data as CustomerFile[]) ?? []);
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      alert("JPG, PNG, WEBP 또는 PDF 파일만 등록할 수 있습니다.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("파일은 10MB 이하만 등록할 수 있습니다.");
      return;
    }

    setIsUploading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsUploading(false);
      alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
      return;
    }

    const extension = getSafeExtension(selectedFile.name);
    const storageFileName = `${crypto.randomUUID()}${extension}`;
    const storagePath = `${user.id}/${customerId}/${storageFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
      });

    if (uploadError) {
      setIsUploading(false);
      alert(`파일을 업로드하지 못했습니다.\n${uploadError.message}`);
      return;
    }

    const { error: recordError } = await supabase
      .from("customer_files")
      .insert({
        user_id: user.id,
        customer_id: customerId,
        storage_path: storagePath,
        original_name: selectedFile.name,
        file_type: selectedType,
        mime_type: selectedFile.type,
        file_size: selectedFile.size,
        memo: fileMemo.trim() || null,
      });

    if (recordError) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);

      setIsUploading(false);
      alert(
        `파일 정보 저장에 실패해 업로드를 취소했습니다.\n${recordError.message}`
      );
      return;
    }

    setIsUploading(false);
    setFileMemo("");
    await loadFiles();
  }

  async function openPreview(file: CustomerFile) {
    setPreviewFile(file);
    setPreviewUrl("");
    setIsPreviewLoading(true);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.storage_path, 300);

    setIsPreviewLoading(false);

    if (error || !data?.signedUrl) {
      setPreviewFile(null);
      alert(
        `미리보기 주소를 만들지 못했습니다.\n${error?.message ?? ""}`
      );
      return;
    }

    setPreviewUrl(data.signedUrl);
  }

  function closePreview() {
    setPreviewFile(null);
    setPreviewUrl("");
    setIsPreviewLoading(false);
  }

  async function handleDownload(file: CustomerFile) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(file.storage_path, 60, {
        download: true,
      });

    if (error || !data?.signedUrl) {
      alert(
        `다운로드 주소를 만들지 못했습니다.\n${error?.message ?? ""}`
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(file: CustomerFile) {
    const shouldDelete = window.confirm(
      `"${file.original_name}" 파일을 삭제하시겠습니까?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingFileId(file.id);

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([file.storage_path]);

    if (storageError) {
      setDeletingFileId(null);
      alert(`저장된 파일을 삭제하지 못했습니다.\n${storageError.message}`);
      return;
    }

    const { error: recordError } = await supabase
      .from("customer_files")
      .delete()
      .eq("id", file.id);

    setDeletingFileId(null);

    if (recordError) {
      alert(
        `파일은 삭제됐지만 목록 정보를 정리하지 못했습니다.\n${recordError.message}`
      );
      return;
    }

    if (previewFile?.id === file.id) {
      closePreview();
    }

    await loadFiles();
  }

  const filteredFiles = useMemo(() => {
    if (typeFilter === "전체") {
      return files;
    }

    return files.filter((file) => file.file_type === typeFilter);
  }, [files, typeFilter]);

  const groupedCounts = useMemo(() => {
    return files.reduce<Record<string, number>>((counts, file) => {
      counts[file.file_type] = (counts[file.file_type] ?? 0) + 1;
      return counts;
    }, {});
  }, [files]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">고객 파일</h2>

              <p className="mt-1 text-sm text-slate-500">
                {customerName} 고객의 사진과 PDF 서류를 종류별로 관리합니다.
              </p>
            </div>

            <p className="text-sm font-semibold text-slate-500">
              전체 {files.length}개
            </p>
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[180px_1fr_auto]">
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="input-style bg-white"
            >
              {fileTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={fileMemo}
              onChange={(event) => setFileMemo(event.target.value)}
              className="input-style bg-white"
              placeholder="파일 메모(선택): 예 · 520i 스마트할부 최종 견적"
            />

            <label
              className={`inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 ${
                isUploading ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {isUploading ? "업로드 중..." : "+ 파일 선택"}

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            JPG, PNG, WEBP, PDF 형식만 가능하며 파일당 최대 10MB입니다.
            고객 개인정보가 포함된 파일은 외부에 공유하지 않도록 주의하세요.
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterButton
              label={`전체 ${files.length}`}
              active={typeFilter === "전체"}
              onClick={() => setTypeFilter("전체")}
            />

            {fileTypeOptions.map((type) => (
              <FilterButton
                key={type}
                label={`${type} ${groupedCounts[type] ?? 0}`}
                active={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              />
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-slate-500">
            파일을 불러오는 중입니다.
          </p>
        ) : filteredFiles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-500">
              해당 종류에 등록된 파일이 없습니다.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {filteredFiles.map((file) => (
              <article
                key={file.id}
                className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {getFileIcon(file.mime_type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        {file.file_type}
                      </span>

                      <span className="text-xs text-slate-400">
                        {formatDate(file.created_at)}
                      </span>
                    </div>

                    <p
                      className="mt-3 truncate text-sm font-bold"
                      title={file.original_name}
                    >
                      {file.original_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatFileSize(file.file_size)}
                    </p>

                    {file.memo && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                        {file.memo}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => openPreview(file)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    미리보기
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                  >
                    다운로드
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(file)}
                    disabled={deletingFileId === file.id}
                    className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingFileId === file.id ? "삭제 중" : "삭제"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {previewFile && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700">
                  {previewFile.file_type}
                </p>

                <h3 className="mt-1 truncate font-bold">
                  {previewFile.original_name}
                </h3>
              </div>

              <button
                type="button"
                onClick={closePreview}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex min-h-[60vh] items-center justify-center overflow-auto bg-slate-100 p-4">
              {isPreviewLoading ? (
                <p className="text-sm text-slate-500">
                  미리보기를 불러오는 중입니다.
                </p>
              ) : isImageFile(previewFile.mime_type) ? (
                <img
                  src={previewUrl}
                  alt={previewFile.original_name}
                  className="max-h-[75vh] max-w-full rounded-lg object-contain"
                />
              ) : previewFile.mime_type === "application/pdf" ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.original_name}
                  className="h-[75vh] w-full rounded-lg bg-white"
                />
              ) : (
                <p className="text-sm text-slate-500">
                  이 파일은 브라우저 미리보기를 지원하지 않습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function getSafeExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  const extension = fileName.slice(dotIndex).toLowerCase();

  return extension.replace(/[^a-z0-9.]/g, "");
}

function getFileIcon(mimeType: string | null) {
  if (mimeType === "application/pdf") {
    return "📄";
  }

  if (isImageFile(mimeType)) {
    return "🖼️";
  }

  return "📎";
}

function isImageFile(mimeType: string | null) {
  return Boolean(mimeType?.startsWith("image/"));
}

function formatFileSize(bytes: number) {
  if (!bytes) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}