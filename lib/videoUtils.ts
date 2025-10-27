const ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g

export function sanitizeFilename(input: string | null | undefined): string {
  const base = (input ?? "").trim()
  if (!base) return "video"

  const cleaned = base.replace(ILLEGAL_CHARS, "").replace(/\s+/g, " ").trim()
  return cleaned.length > 0 ? cleaned : "video"
}

// 動画変換用の定数
export const ALLOWED_VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "flv",
  "wmv",
  "mpeg",
  "mpg",
])

export const MAX_VIDEO_FILES = 5
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB in bytes

// ファイルサイズをフォーマット
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ビデオコーデック判定 (VP9/AV1優先)
export type VideoCodec = "vp9" | "av1"

export function getPreferredCodec(): VideoCodec {
  // ブラウザ対応チェック（実際には MediaRecorder API の isTypeSupported で判定できる）
  // ここでは一旦VP9をデフォルトとする
  return "vp9"
}
