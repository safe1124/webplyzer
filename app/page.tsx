"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Sortable, { SortableEvent } from "sortablejs";
import clsx from "clsx";
import { ALLOWED_EXTENSIONS, MAX_FILES, sanitizeFilename } from "@/lib/sanitizeFilename";
import { Locale, localeOptions, messages } from "@/lib/i18n";

type FileItem = {
  id: string;
  file: File;
  previewUrl: string;
  sizeLabel: string;
};

type Feedback =
  | {
      tone: "success" | "error";
      text: string;
    }
  | null;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return list;
  const updated = [...list];
  const [moved] = updated.splice(fromIndex, 1);
  if (!moved) return list;
  updated.splice(toIndex, 0, moved);
  return updated;
}

async function downloadMultiple(
  files: Array<{ blob: Blob; name: string }>,
  zipName: string
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  files.forEach(({ blob, name }) => zip.file(name, blob));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, zipName);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function resolveErrorMessage(code: string | undefined, locale: Locale): string {
  const dict = messages[locale];
  switch (code) {
    case "no_file":
      return dict.no_file_selected;
    case "too_many_files":
      return `${dict.error}: ${dict.max_25_files}`;
    case "no_valid_files":
      return dict.conversion_error;
    case "unsupported_file":
      return dict.unsupported_file;
    default:
      return dict.conversion_error;
  }
}

export default function HomePage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [baseName, setBaseName] = useState("image");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [locale, setLocale] = useState<Locale>("ja");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLLabelElement | null>(null);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const sortableRef = useRef<Sortable | null>(null);
  const itemsRef = useRef<FileItem[]>([]);

  const t = useMemo(() => messages[locale], [locale]);

  useEffect(() => {
    const autoLocale = localeOptions.find((option) =>
      navigator.language.toLowerCase().startsWith(option.code)
    );
    if (autoLocale) {
      setLocale(autoLocale.code);
    }
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const el = galleryRef.current;

    if (!el || items.length === 0) {
      sortableRef.current?.destroy();
      sortableRef.current = null;
      return;
    }

    sortableRef.current?.destroy();
    sortableRef.current = Sortable.create(el, {
      animation: 200,
      handle: ".js-drag-handle",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      onEnd: (event: SortableEvent) => {
        const { oldIndex, newIndex } = event;
        if (
          typeof oldIndex !== "number" ||
          typeof newIndex !== "number" ||
          oldIndex === newIndex
        ) {
          return;
        }
        setItems((prev) => reorderList(prev, oldIndex, newIndex));
      },
    });

    return () => {
      sortableRef.current?.destroy();
      sortableRef.current = null;
    };
  }, [items.length]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      sortableRef.current?.destroy();
    };
  }, []);

  const handleFilesAdded = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (!incoming.length) return;

    let blockedByLimit = false;
    let rejectedUnsupported = false;

    setItems((prev) => {
      const next = [...prev];

      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          blockedByLimit = true;
          break;
        }

        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXTENSIONS.has(extension)) {
          rejectedUnsupported = true;
          continue;
        }

        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);

        next.push({
          id,
          file,
          previewUrl,
          sizeLabel: formatFileSize(file.size),
        });
      }

      return next;
    });

    if (blockedByLimit) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.max_25_files}` });
    } else if (rejectedUnsupported) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.unsupported_file}` });
    } else {
      setFeedback(null);
    }
  };

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    setFeedback({ tone: "success", text: t.file_removed });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!items.length) {
      setFeedback({ tone: "error", text: t.no_file_selected });
      return;
    }

    const safeBaseName = sanitizeFilename(baseName);
    setIsConverting(true);
    setProgress({ current: 0, total: items.length });
    setFeedback(null);

    try {
      const converted: Array<{ blob: Blob; name: string }> = [];

      for (let index = 0; index < items.length; index += 1) {
        setProgress({ current: index + 1, total: items.length });
        const current = items[index];
        const formData = new FormData();
        formData.append("base_name", safeBaseName);
        formData.append("file_index", (index + 1).toString());
        formData.append("files", current.file, current.file.name);

        const response = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          const message = resolveErrorMessage(payload?.error, locale);
          throw new Error(message);
        }

        const blob = await response.blob();
        converted.push({
          blob,
          name: `${safeBaseName}_${index + 1}.webp`,
        });
      }

      if (converted.length === 1) {
        downloadBlob(converted[0].blob, converted[0].name);
      } else {
        await downloadMultiple(converted, `${safeBaseName}_webp.zip`);
      }

      setFeedback({ tone: "success", text: t.success_message });
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        return [];
      });
    } catch (error) {
      if (error instanceof Error) {
        setFeedback({ tone: "error", text: error.message });
      } else {
        setFeedback({ tone: "error", text: t.conversion_error });
      }
    } finally {
      setIsConverting(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center px-4 pb-16">
      <div className="relative mt-12 flex w-full max-w-[1280px] flex-col gap-8 rounded-3xl border border-white/70 bg-white/95 p-10 shadow-surface backdrop-blur-xl">
        <header className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-700 md:text-4xl">
            {t.title}
          </h1>
          <div className="flex flex-wrap justify-center gap-3">
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => setLocale(option.code)}
                className={clsx(
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  locale === option.code
                    ? "border-transparent bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-lg"
                    : "border-brand-100 bg-brand-50/80 text-slate-600 hover:border-brand-200 hover:bg-white"
                )}
              >
                <span>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <main>
          <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2 text-left">
                  <span className="text-sm font-semibold text-slate-600">{t.filename_label}</span>
                  <input
                    value={baseName}
                    onChange={(event) => setBaseName(event.target.value)}
                    placeholder={t.filename_placeholder}
                    className="w-full rounded-xl border-2 border-brand-100 bg-brand-50/60 px-4 py-3 text-base font-medium text-slate-800 outline-none transition focus:border-brand-400 focus:bg-white focus:shadow-lg"
                  />
                </label>

                <label
                  ref={dropRef}
                  htmlFor="fileInput"
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dropRef.current) {
                      dropRef.current.dataset.dropping = "true";
                    }
                  }}
                  onDragLeave={() => {
                    if (dropRef.current) {
                      delete dropRef.current.dataset.dropping;
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dropRef.current) {
                      delete dropRef.current.dataset.dropping;
                    }
                    handleFilesAdded(event.dataTransfer.files);
                  }}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 px-6 py-10 text-center transition",
                    dropRef.current?.dataset.dropping
                      ? "border-brand-500 bg-brand-100/80"
                      : "hover:border-brand-400 hover:bg-brand-100/60"
                  )}
                >
                  <span className="text-base font-semibold text-slate-700">{t.upload_label}</span>
                  <p className="text-sm text-slate-500">
                    JPG / JPEG / PNG · {t.max}: {MAX_FILES}
                  </p>
                  <input
                    ref={fileInputRef}
                    id="fileInput"
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        handleFilesAdded(event.target.files);
                        event.target.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-gradient-to-r from-brand-500 to-brand-400 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-brand-500"
                  >
                    {t.add_more}
                  </button>
                </label>

                {feedback && (
                  <p
                    className={clsx(
                      "rounded-xl px-4 py-3 text-sm font-semibold shadow-sm",
                      feedback.tone === "success"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {feedback.text}
                  </p>
                )}

                <footer className="text-xs font-medium text-slate-500">{t.footer_text}</footer>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm font-semibold text-slate-600">{t.selected_files}</span>
                  <span className="text-sm font-semibold text-brand-600">
                    {items.length} {t.files_unit} / {t.max} {MAX_FILES}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div
                    ref={galleryRef}
                    className="grid max-h-[540px] grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3"
                  >
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        data-id={item.id}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-32 w-full object-cover"
                            draggable={false}
                          />
                          <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white shadow">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isConverting}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/90 text-lg text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={t.remove}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-4">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                            {item.file.name}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{item.sizeLabel}</span>
                            <button
                              type="button"
                              className="js-drag-handle cursor-grab text-brand-500 transition hover:text-brand-600 active:cursor-grabbing"
                              disabled={isConverting}
                              aria-label={t.drag_to_reorder}
                            >
                              ⋮⋮
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-brand-100 bg-brand-50/40 text-sm text-slate-400">
                    {t.no_file_selected}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!items.length || isConverting}
                  className={clsx(
                    "mt-4 w-full rounded-2xl bg-gradient-to-r from-brand-500 to-brand-400 px-6 py-4 text-lg font-bold text-white shadow-lg transition",
                    !items.length || isConverting
                      ? "cursor-not-allowed opacity-60"
                      : "hover:from-brand-600 hover:to-brand-500"
                  )}
                >
                  {isConverting
                    ? `${t.converting}${progress ? ` (${progress.current}/${progress.total})` : ""}`
                    : t.convert_button}
                </button>

                {progress && (
                  <div className="mt-2">
                    <div className="h-2 rounded-full bg-brand-100">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-all"
                        style={{
                          width: `${Math.round((progress.current / progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {t.converting} {progress.current}/{progress.total}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
