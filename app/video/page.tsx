"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import {
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_FILES,
  MAX_VIDEO_SIZE,
  formatFileSize,
  sanitizeFilename,
} from "@/lib/videoUtils"
import { type Locale, localeOptions, messages } from "@/lib/i18n"

type VideoItem = {
  id: string
  file: File
  previewUrl: string
  sizeLabel: string
}

type Feedback = {
  tone: "success" | "error" | "info"
  text: string
} | null

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

async function downloadMultiple(files: Array<{ blob: Blob; name: string }>, zipName: string): Promise<void> {
  const { default: JSZip } = await import("jszip")
  const zip = new JSZip()
  files.forEach(({ blob, name }) => zip.file(name, blob))
  const blob = await zip.generateAsync({ type: "blob" })
  downloadBlob(blob, zipName)
}

export default function VideoConverterPage() {
  const [items, setItems] = useState<VideoItem[]>([])
  const [baseName, setBaseName] = useState("video")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [locale, setLocale] = useState<Locale>("ja")
  const [bitrate, setBitrate] = useState("1M")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dropRef = useRef<HTMLLabelElement | null>(null)

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
    return () => {
      items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [items])

  const handleFilesAdded = (files: FileList | File[]) => {
    const incoming = Array.from(files)
    if (!incoming.length) return

    let blockedByLimit = false
    let rejectedUnsupported = false
    let rejectedTooLarge = false

    setItems((prev) => {
      const next = [...prev]

      for (const file of incoming) {
        if (next.length >= MAX_VIDEO_FILES) {
          blockedByLimit = true
          break
        }

        const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
        if (!ALLOWED_VIDEO_EXTENSIONS.has(extension)) {
          rejectedUnsupported = true
          continue
        }

        if (file.size > MAX_VIDEO_SIZE) {
          rejectedTooLarge = true
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
      setFeedback({ tone: "error", text: `${t.error}: ${t.video_max_files}` })
    } else if (rejectedTooLarge) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.video_file_too_large}` })
    } else if (rejectedUnsupported) {
      setFeedback({ tone: "error", text: `${t.error}: ${t.video_unsupported_file}` })
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

  const uploadFileWithProgress = (
    formData: FormData,
    onProgress: (percent: number) => void
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          onProgress(percentComplete)
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response)
        } else {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Network error"))
      })

      xhr.open("POST", "/api/convert-video")
      xhr.responseType = "blob"
      xhr.send(formData)
    })
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

        const formData = new FormData()
        formData.append("file", current.file)
        formData.append("bitrate", bitrate)
        formData.append("baseName", safeBaseName)
        formData.append("fileIndex", (index + 1).toString())

        // Upload with progress
        setUploadProgress(0)
        const blob = await uploadFileWithProgress(formData, (percent) => {
          setUploadProgress(percent)
        })
        setUploadProgress(null)

        const outputName = `${safeBaseName}_${index + 1}.webm`
        converted.push({ blob, name: outputName })
      }

      if (converted.length === 1) {
        downloadBlob(converted[0].blob, converted[0].name)
      } else {
        await downloadMultiple(converted, `${safeBaseName}_webm.zip`)
      }

      setFeedback({ tone: "success", text: t.video_success_message })
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.previewUrl))
        return []
      })
    } catch (error) {
      console.error("[VideoConverter] Error:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (errorMessage.includes("video_conversion_failed")) {
        setFeedback({ tone: "error", text: t.video_conversion_failed })
      } else if (errorMessage.includes("Network error")) {
        setFeedback({ tone: "error", text: "ネットワークエラーが発生しました" })
      } else {
        setFeedback({ tone: "error", text: t.conversion_error })
      }
    } finally {
      setIsConverting(false)
      setProgress(null)
      setUploadProgress(null)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-start justify-center overflow-hidden px-4 py-8 md:py-12">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-pink-50/30 to-orange-50/50" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-pink-100/30 via-transparent to-transparent" />

      <div className="relative flex w-full max-w-7xl flex-col gap-6 rounded-[2rem] border border-white/60 bg-white/40 p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-2xl backdrop-saturate-150 md:gap-8 md:p-10">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9)]" />

        <header className="relative flex flex-col items-center gap-2 text-center md:gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-black md:text-5xl">
            {t.video_title}
          </h1>
          <p className="text-base font-medium text-black md:text-lg">
            <span className="text-purple-600 font-semibold">MP4, MOV, AVI, MKV</span>{" "}
            {locale === "ja" && "等をWebM（VP9/AV1）形式に一括変換"}
            {locale === "en" && "to WebM (VP9/AV1) format"}
            {locale === "ko" && "등을 WebM (VP9/AV1) 형식으로 일괄 변환"}
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
                    ? "border-purple-200/50 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_4px_16px_0_rgba(168,85,247,0.4)] backdrop-blur-xl"
                    : "border-white/60 bg-white/50 text-slate-700 shadow-sm backdrop-blur-xl hover:border-purple-200/60 hover:bg-white/70 hover:shadow-md",
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
                    <span className="text-sm font-semibold text-slate-700">{t.video_filename_label}</span>
                    <input
                      value={baseName}
                      onChange={(event) => setBaseName(event.target.value)}
                      placeholder={t.video_filename_placeholder}
                      className="w-full rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-base font-medium text-slate-800 shadow-sm backdrop-blur-xl outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-purple-300/60 focus:bg-white/80 focus:shadow-[0_4px_16px_0_rgba(168,85,247,0.15)] focus:ring-2 focus:ring-purple-200/50"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-xl">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-slate-700">{t.video_options_title}</h3>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{t.video_bitrate_label}</span>
                        <span className="text-sm font-bold text-purple-600">{bitrate}</span>
                      </label>
                      <select
                        value={bitrate}
                        onChange={(e) => setBitrate(e.target.value)}
                        className="w-full rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 text-base font-medium text-slate-800 shadow-sm backdrop-blur-xl outline-none transition-all duration-200 focus:border-purple-300/60 focus:ring-2 focus:ring-purple-200/50"
                      >
                        <option value="500k">500 Kbps (low)</option>
                        <option value="1M">1 Mbps (medium)</option>
                        <option value="2M">2 Mbps (high)</option>
                        <option value="4M">4 Mbps (very high)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <label
                  ref={dropRef}
                  htmlFor="videoInput"
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
                      ? "border-purple-400/60 bg-purple-50/60 shadow-[0_8px_24px_0_rgba(168,85,247,0.2)] backdrop-blur-xl"
                      : "border-white/60 bg-white/40 shadow-sm backdrop-blur-xl hover:border-purple-300/60 hover:bg-white/60 hover:shadow-md",
                  )}
                >
                  <div className="text-5xl">🎥</div>
                  <span className="text-base font-semibold text-slate-700">{t.video_upload_label}</span>
                  <p className="text-sm text-slate-500">
                    MP4 / MOV / AVI / MKV / WebM · {t.max}: {MAX_VIDEO_FILES} · {formatFileSize(MAX_VIDEO_SIZE)} {locale === "ja" ? "以内" : locale === "ko" ? "이내" : "max"}
                  </p>
                  <input
                    ref={fileInputRef}
                    id="videoInput"
                    type="file"
                    accept="video/*"
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
                    className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_0_rgba(168,85,247,0.4)] transition-all duration-200 hover:shadow-[0_6px_20px_0_rgba(168,85,247,0.5)] active:scale-95"
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
                        : feedback.tone === "info"
                          ? "border-blue-200/50 bg-blue-50/80 text-blue-700"
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
                  <span className="text-sm font-semibold text-purple-600">
                    {items.length} {t.files_unit} / {t.max} {MAX_VIDEO_FILES}
                  </span>
                </div>

                {items.length > 0 ? (
                  <div className="grid max-h-[600px] grid-cols-1 gap-3 overflow-y-auto rounded-2xl pr-1">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_0_rgba(31,38,135,0.15)]"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg">
                          {index + 1}
                        </span>
                        <div className="flex flex-1 flex-col gap-1">
                          <p className="line-clamp-1 text-sm font-semibold text-slate-800">{item.file.name}</p>
                          <p className="text-xs text-slate-500">{item.sizeLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={isConverting}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/95 text-base font-bold text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-red-600 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={t.remove}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-white/60 bg-white/30 shadow-sm backdrop-blur-xl lg:min-h-[500px]">
                    <div className="text-6xl opacity-20">🎬</div>
                    <p className="text-sm font-medium text-slate-400">{t.no_file_selected}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!items.length || isConverting}
                  className={clsx(
                    "mt-2 w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-base font-bold text-white shadow-[0_4px_16px_0_rgba(168,85,247,0.4)] transition-all duration-200",
                    !items.length || isConverting
                      ? "cursor-not-allowed opacity-50"
                      : "hover:shadow-[0_6px_20px_0_rgba(168,85,247,0.5)] active:scale-[0.98]",
                  )}
                >
                  {isConverting
                    ? `${t.video_converting}${progress ? ` (${progress.current}/${progress.total})` : ""}`
                    : t.video_convert_button}
                </button>

                {progress && (
                  <div className="space-y-3">
                    {uploadProgress !== null && (
                      <div className="space-y-2">
                        <p className="text-center text-xs font-semibold text-purple-600">
                          📤 {t.uploading}... {uploadProgress}%
                        </p>
                        <div className="h-2 overflow-hidden rounded-full bg-white/60 shadow-inner backdrop-blur-xl">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-sm transition-all duration-300"
                            style={{
                              width: `${uploadProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-center text-xs font-semibold text-pink-600">
                        🎬 {t.video_converting} {progress.current}/{progress.total}
                      </p>
                      <div className="h-2 overflow-hidden rounded-full bg-white/60 shadow-inner backdrop-blur-xl">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-sm transition-all duration-300"
                          style={{
                            width: `${Math.round((progress.current / progress.total) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
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
