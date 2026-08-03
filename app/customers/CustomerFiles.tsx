"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type StorageFile = {
  name: string;
  id: string | null;
  created_at: string | null;
  updated_at: string | null;
  metadata: {
    size?: number;
    mimetype?: string;
  } | null;
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
  "image/webp",
  "application/pdf",
];

export default function CustomerFiles({
  customerId,
  customerName,
}: CustomerFilesProps) {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folderPath, setFolderPath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState<string | null>(
    null
  );

  useEffect(() => {
    void initializeFiles();
  }, [customerId]);

  async function initializeFiles() {
    setIsLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setIsLoading(false);
      alert("로그인 정보를 확인하지 못했습니다.");
      return;
    }

    const path = `${user.id}/${customerId}`;

    setFolderPath(path);
    await loadFiles(path);
  }

  async function loadFiles(path = folderPath) {
    if (!path) {
      return;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: {
          column: "created_at",
          order: "desc",
        },
      });

    setIsLoading(false);

    if (error) {
      alert(`파일 목록을 불러오지 못했습니다.\n${error.message}`);
      return;
    }

    setFiles((data as StorageFile[]) ?? []);
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

    if (!folderPath) {
      alert("파일 저장 경로를 준비하지 못했습니다.");
      return;
    }

    setIsUploading(true);

    const safeFileName = createSafeFileName(selectedFile.name);
    const filePath = `${folderPath}/${safeFileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedFile.type,
      });

    setIsUploading(false);

    if (error) {
      alert(`파일을 업로드하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadFiles();
  }

  async function handleDownload(fileName: string) {
    if (!folderPath) {
      return;
    }

    const filePath = `${folderPath}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 60);

    if (error || !data?.signedUrl) {
      alert(
        `파일 다운로드 주소를 만들지 못했습니다.\n${
          error?.message ?? ""
        }`
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(fileName: string) {
    const shouldDelete = window.confirm(
      `"${getOriginalFileName(fileName)}" 파일을 삭제하시겠습니까?`
    );

    if (!shouldDelete || !folderPath) {
      return;
    }

    setDeletingFileName(fileName);

    const filePath = `${folderPath}/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    setDeletingFileName(null);

    if (error) {
      alert(`파일을 삭제하지 못했습니다.\n${error.message}`);
      return;
    }

    await loadFiles();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold">고객 파일</h2>

          <p className="mt-1 text-sm text-slate-500">
            {customerName} 고객의 사진과 PDF 서류를 관리합니다.
          </p>
        </div>

        <label
          className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 ${
            isUploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {isUploading ? "업로드 중..." : "+ 파일 등록"}

          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        JPG, PNG, WEBP, PDF 형식만 가능하며 파일당 최대 10MB입니다.
        초기 테스트에는 신분증처럼 민감한 자료 대신 일반 사진이나
        테스트 PDF를 사용하세요.
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-slate-500">
          파일을 불러오는 중입니다.
        </p>
      ) : files.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">
            등록된 파일이 없습니다.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            출고 사진이나 일반 PDF 파일을 먼저 등록해보세요.
          </p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200">
          {files.map((file) => (
            <article
              key={file.name}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  {getFileIcon(file)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {getOriginalFileName(file.name)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {formatFileSize(file.metadata?.size ?? 0)}
                    {" · "}
                    {formatDate(file.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(file.name)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                >
                  열기·다운로드
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(file.name)}
                  disabled={deletingFileName === file.name}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingFileName === file.name ? "삭제 중" : "삭제"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function createSafeFileName(originalName: string) {
  const dotIndex = originalName.lastIndexOf(".");

  const extension =
    dotIndex >= 0
      ? originalName.slice(dotIndex).toLowerCase().replace(/[^a-z0-9.]/g, "")
      : "";

  const baseName =
    dotIndex >= 0 ? originalName.slice(0, dotIndex) : originalName;

  const bytes = new TextEncoder().encode(baseName);

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const encodedName = btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${Date.now()}__${encodedName || "file"}${extension}`;
}

function getOriginalFileName(storedName: string) {
  const separatorIndex = storedName.indexOf("__");

  if (separatorIndex === -1) {
    return storedName;
  }

  const encodedPartWithExtension = storedName.slice(separatorIndex + 2);
  const dotIndex = encodedPartWithExtension.lastIndexOf(".");

  const encodedName =
    dotIndex >= 0
      ? encodedPartWithExtension.slice(0, dotIndex)
      : encodedPartWithExtension;

  const extension =
    dotIndex >= 0 ? encodedPartWithExtension.slice(dotIndex) : "";

  try {
    const paddedEncodedName =
      encodedName + "=".repeat((4 - (encodedName.length % 4)) % 4);

    const binary = atob(
      paddedEncodedName.replace(/-/g, "+").replace(/_/g, "/")
    );

    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );

    const decodedName = new TextDecoder().decode(bytes);

    return `${decodedName}${extension}`;
  } catch {
    return encodedPartWithExtension;
  }
}

function getFileIcon(file: StorageFile) {
  const mimeType = file.metadata?.mimetype ?? "";

  if (mimeType === "application/pdf") {
    return "📄";
  }

  if (mimeType.startsWith("image/")) {
    return "🖼️";
  }

  return "📎";
}

function formatFileSize(bytes: number) {
  if (!bytes) {
    return "크기 확인 불가";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | null) {
  if (!date) {
    return "날짜 확인 불가";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}