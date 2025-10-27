"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import Sortable, { type SortableEvent } from "sortablejs"
import clsx from "clsx"
import { ALLOWED_EXTENSIONS, MAX_FILES, sanitizeFilename } from "@/lib/sanitizeFilename"
import { type Locale, localeOptions, messages } from "@/lib/i18n"

type FileItem = {
  id: string
  file: File
  previewUrl: string
  sizeLabel: string
}

type Feedback = {
  tone: "success" | "error"
  text: string
} | null

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return list
  const updated = [...list]
  const [moved] = updated.splice(fromIndex, 1)
  if (!moved) return list
  updated.splice(toIndex, 0, moved)
  return updated
}

async function downloadMultiple(files: Array<{ blob: Blob; name: string }>, zipName: string): Promise<void> {
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()
  files.forEach(({ blob, name }) => zip.file(name, blob))
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(blob, zipName)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function resolveErrorMessage(code: string | undefined, locale: Locale): string {
  const dict = messages[locale]
  switch (code) {
    case "no_file":
      return dict.no_file_selected
    case "too_many_files":
      return `${dict.error}: ${dict.max_25_files}`
    case "no_valid_files":
      return dict.conversion_error
    case "unsupported_file":
      return dict.unsupported_file
    case "invalid_payload":
    case "source_not_found":
    case "empty_file":
    case "internal_error":
      return dict.conversion_error
    default:
      return dict.conversion_error
  }
}

export default function HomePage() {
  const [items, setItems] = useState<FileItem[]>([])
  const [baseName, setBaseName] = useState("image")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [locale, setLocale] = useState<Locale>("ja")
  const [quality, setQuality] = useState(90)
  const [enableResize, setEnableResize] = useState(false)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [maxHeight, setMaxHeight] = useState(1080)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dropRef = useRef<HTMLLabelElement | null>(null)
  const galleryRef = useRef<HTMLDivElement | null>(null)
  const sortableRef = useRef<Sortable | null>(null)
  const itemsRef = useRef<FileItem[]>([])

  const t = useMemo(() => messages[locale], [locale])

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale | null
    if (savedLocale && ["ja", "en", "ko"].includes(savedLocale)) {
      setLocale(savedLocale)
    }
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    const el = galleryRef.current

    if (!el || items.length === 0) {
      sortableRef.current?.destroy()
      sortableRef.current = null
      return
    }

    sortableRef.current?.destroy()
    sortableRef.current = Sortable.create(el, {
      animation: 200,
      handle: ".js-drag-handle",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      onEnd: (event: SortableEvent) => {
        const { oldIndex, newIndex } = event
        if (typeof oldIndex !== "number" || typeof newIndex !== "number" || oldIndex === newIndex) {
          return
        }
        setItems((prev) => reorderList(prev, oldIndex, newIndex))
      },
    })

    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [items.length])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      sortableRef.current?.destroy()
    }
  }, [])

  const handleFilesAdded = (files: FileList | File[]) => {
    const incoming = Array.from(files)
    if (!incoming.length) return

    let blockedByLimit = false
    let rejectedUnsupported = false

    setItems((prev) => {
      const next = [...prev]

      for (const file of incoming) {
        if (next.length >= MAX_FILES) {
          blockedByLimit = true
          break
        }

        const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
        if (!ALLOWED_EXTENSIONS.has(extension)) {
          rejectedUnsupported = true
          continue
        }

        const id = crypto.randomUUID()
        const previewUrl = URL.createObjectURL(file)

        next.push({
          id,
          file,
          previewUrl,
          sizeLabel: formatFileSize(file.size),
        })
      }

      return next
    })

    if (blockedByLimit) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.max_25_files}` })
    } else if (rejectedUnsupported) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.unsupported_file}` })
    } else {
      setFeedback(null)
    }
  }

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const removed = prev.find((item) => item.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
    setFeedback({ tone: "success", text: t.file_removed })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!items.length) {
      setFeedback({ tone: "error", text: t.no_file_selected })
      return
    }

    const safeBaseName = sanitizeFilename(baseName)
    setIsConverting(true)
    setProgress({ current: 0, total: items.length })
    setFeedback(null)

    try {
      const converted: Array<{ blob: Blob; name: string }> = []

      for (let index = 0; index < items.length; index += 1) {
        setProgress({ current: index + 1, total: items.length })
        const current = items[index]

        // 파일을 Vercel Blob에 직접 업로드 (클라이언트 업로드, 4.5MB 이상 지원)
        let sourceUpload: { url: string; pathname: string }
        try {
          const blob = await upload(current.file.name, current.file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          })

          sourceUpload = {
            url: blob.url,
            pathname: blob.pathname,
          }
        } catch (error) {
          console.error("[converter] upload failed", error)
          throw new Error(t.conversion_error)
        }

        const convertPayload: Record<string, unknown> = {
          sourceUrl: sourceUpload.url,
          sourcePathname: sourceUpload.pathname,
          originalName: current.file.name,
          baseName: safeBaseName,
          fileIndex: index + 1,
          quality,
          cleanupSource: true,
        }

        if (enableResize) {
          convertPayload.maxWidth = maxWidth
          convertPayload.maxHeight = maxHeight
          convertPayload.maintainAspectRatio = maintainAspectRatio
        }

        const response = await fetch("/api/convert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(convertPayload),
        })

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; name?: string; downloadUrl?: string; url?: string }
          | null

        const downloadTarget = payload?.downloadUrl ?? payload?.url

        if (!response.ok || !payload?.ok || !downloadTarget) {
          if (typeof window !== "undefined") {
            // Surface details to the console for easier debugging in dev
            // eslint-disable-next-line no-console
            console.error("[converter] convert failed", {
              status: response.status,
              payload,
            })
          }
          const message = resolveErrorMessage(payload?.error, locale)
          throw new Error(message)
        }

        const downloadResponse = await fetch(downloadTarget, { cache: "no-store" })
        if (!downloadResponse.ok) {
          throw new Error(t.conversion_error)
        }

        const blob = await downloadResponse.blob()
        converted.push({
          blob,
          name: payload.name ?? `${safeBaseName}_${index + 1}.webp`,
        })
      }

      if (converted.length === 1) {
        downloadBlob(converted[0].blob, converted[0].name)
      } else {
        await downloadMultiple(converted, `${safeBaseName}_webp.zip`)
      }

      setFeedback({ tone: "success", text: t.success_message })
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
        return []
      })
    } catch (error) {
      if (error instanceof Error) {
        setFeedback({ tone: "error", text: error.message })
      } else {
        setFeedback({ tone: "error", text: t.conversion_error })
      }
    } finally {
      setIsConverting(false)
      setProgress(null)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-start justify-center overflow-hidden px-4 py-8 md:py-12">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-100/30 via-transparent to-transparent" />

      <div className="relative flex w-full max-w-7xl flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-2xl backdrop-saturate-150 md:gap-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9)]" />

        <header className="relative flex flex-col items-center gap-2 text-center md:gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-black md:text-5xl">
            {t.title}
          </h1>
          <p className="text-base font-medium text-black md:text-lg">
            <span className="text-blue-600 font-semibold">JPG, JPEG, PNG, HEIC, HEIF</span>{" "}
            {locale === "ja" && "形式をWebp形式に一括変換"}
            {locale === "en" && "to WebP format"}
            {locale === "ko" && "형식을 WebP 형식으로 일괄 변환"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => handleLocaleChange(option.code)}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 md:px-5 md:py-2.5",
                  locale === option.code
                    ? "border-blue-200/50 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_4px_16px_0_rgba(59,130,246,0.4)] backdrop-blur-xl"
                    : "border-white/60 bg-white/50 text-slate-700 shadow-sm backdrop-blur-xl hover:border-blue-200/60 hover:bg-white/70 hover:shadow-md",
                )}
              >
                <span>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <main className="relative">
          <form className="flex flex-col gap-6 md:gap-8" onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex h-full flex-col gap-6">
                <div className="rounded-2xl border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-xl">
                  <label className="flex flex-col gap-2 text-left">
                    <span className="text-sm font-semibold text-slate-700">{t.filename_label}</span>
                    <input
                      value={baseName}
                      onChange={(event) => setBaseName(event.target.value)}
                      placeholder={t.filename_placeholder}
                      className="w-full rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-base font-medium text-slate-800 shadow-sm backdrop-blur-xl outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300/60 focus:bg-white/80 focus:shadow-[0_4px_16px_0_rgba(59,130,246,0.15)] focus:ring-2 focus:ring-blue-200/50"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-xl">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-700">{t.options_title}</h3>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{t.quality_label}</span>
                        <span className="text-sm font-bold text-blue-600">{quality}</span>
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>50</span>
                        <span>100</span>
                      </div>
                    </div>

                    <div className="border-t border-white/60 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableResize}
                          onChange={(e) => setEnableResize(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-200/50"
                        />
                        <span className="text-sm font-semibold text-slate-700">{t.enable_resize}</span>
                      </label>

                      {enableResize && (
                        <div className="mt-3 flex flex-col gap-3 pl-6">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-slate-600">{t.max_width}</span>
                              <input
                                type="number"
                                min="100"
                                max="10000"
                                value={maxWidth}
                                onChange={(e) => setMaxWidth(Number(e.target.value))}
                                className="rounded-lg border border-white/60 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl outline-none transition-all duration-200 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-200/50"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-slate-600">{t.max_height}</span>
                              <input
                                type="number"
                                min="100"
                                max="10000"
                                value={maxHeight}
                                onChange={(e) => setMaxHeight(Number(e.target.value))}
                                className="rounded-lg border border-white/60 bg-white/60 px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-xl outline-none transition-all duration-200 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-200/50"
                              />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={maintainAspectRatio}
                              onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-200/50"
                            />
                            <span className="text-xs font-medium text-slate-600">{t.maintain_aspect_ratio}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <label
                  ref={dropRef}
                  htmlFor="fileInput"
                  onDragOver={(event) => {
                    event.preventDefault()
                    if (dropRef.current) {
                      dropRef.current.dataset.dropping = "true"
                    }
                  }}
                  onDragLeave={() => {
                    if (dropRef.current) {
                      delete dropRef.current.dataset.dropping
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dropRef.current) {
                      delete dropRef.current.dataset.dropping
                    }
                    handleFilesAdded(event.dataTransfer.files)
                  }}
                  className={clsx(
                    "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300 lg:py-16",
                    dropRef.current?.dataset.dropping
                      ? "border-blue-400/60 bg-blue-50/60 shadow-[0_8px_24px_0_rgba(59,130,246,0.2)] backdrop-blur-xl"
                      : "border-white/60 bg-white/40 shadow-sm backdrop-blur-xl hover:border-blue-300/60 hover:bg-white/60 hover:shadow-md",
                  )}
                >
                  <div className="text-5xl">📁</div>
                  <span className="text-base font-semibold text-slate-700">{t.upload_label}</span>
                  <p className="text-sm text-slate-500">
                    JPG / JPEG / PNG / HEIC / HEIF · {t.max}: {MAX_FILES}
                  </p>
                  <input
                    ref={fileInputRef}
                    id="fileInput"
                    type="file"
                    accept=".jpg,.jpeg,.png,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      if (event.target.files) {
                        handleFilesAdded(event.target.files)
                        event.target.value = ""
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      fileInputRef.current?.click()
                    }}
                    className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_0_rgba(59,130,246,0.4)] transition-all duration-200 hover:shadow-[0_6px_20px_0_rgba(59,130,246,0.5)] active:scale-95"
                  >
                    {t.add_more}
                  </button>
                </label>

                {feedback && (
                  <p
                    className={clsx(
                      "rounded-2xl border px-5 py-3.5 text-sm font-semibold shadow-sm backdrop-blur-xl",
                      feedback.tone === "success"
                        ? "border-green-200/50 bg-green-50/80 text-green-700"
                        : "border-red-200/50 bg-red-50/80 text-red-700",
                    )}
                  >
                    {feedback.text}
                  </p>
                )}

                <footer className="text-xs font-medium text-slate-500">{t.footer_text}</footer>
              </div>

              <div className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-xl">
                  <span className="text-sm font-semibold text-slate-700">{t.selected_files}</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {items.length} {t.files_unit} / {t.max} {MAX_FILES}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div
                    ref={galleryRef}
                    className="grid max-h-[600px] grid-cols-2 gap-3 overflow-y-auto rounded-2xl pr-1 lg:grid-cols-3"
                  >
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        data-id={item.id}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.15)]"
                      >
                        <div className="relative">
                          <img
                            src={item.previewUrl || "/placeholder.svg"}
                            alt={item.file.name}
                            className="aspect-square w-full object-cover"
                            draggable={false}
                          />
                          <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={isConverting}
                            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/95 text-base font-bold text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-red-600 hover:scale-110 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={t.remove}
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5 p-3">
                          <p className="line-clamp-1 text-xs font-semibold text-slate-800">{item.file.name}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{item.sizeLabel}</span>
                            <button
                              type="button"
                              className="js-drag-handle cursor-grab text-base text-blue-500 transition-all duration-200 hover:text-blue-600 hover:scale-110 active:cursor-grabbing"
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
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/60 bg-white/30 shadow-sm backdrop-blur-xl lg:min-h-[500px]">
                    <div className="text-6xl opacity-20">📂</div>
                    <p className="text-sm font-medium text-slate-400">{t.no_file_selected}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!items.length || isConverting}
                  className={clsx(
                    "mt-2 w-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_0_rgba(59,130,246,0.4)] transition-all duration-200",
                    !items.length || isConverting
                      ? "cursor-not-allowed opacity-50"
                      : "hover:shadow-[0_6px_20px_0_rgba(59,130,246,0.5)] active:scale-[0.98]",
                  )}
                >
                  {isConverting
                    ? `${t.converting}${progress ? ` (${progress.current}/${progress.total})` : ""}`
                    : t.convert_button}
                </button>

                {progress && (
                  <div className="space-y-2">
                    <div className="h-2 overflow-hidden rounded-full bg-white/60 shadow-inner backdrop-blur-xl">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm transition-all duration-300"
                        style={{
                          width: `${Math.round((progress.current / progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-center text-xs font-medium text-slate-500">
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
  )
}
