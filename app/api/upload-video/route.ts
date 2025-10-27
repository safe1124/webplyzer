import { NextRequest } from "next/server"
import { put } from "@vercel/blob"
import { randomUUID } from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv", "mpeg", "mpg"]
const MAX_VIDEO_SIZE = 200 * 1024 * 1024 // 200MB

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null
}

function isUsingBlob(): boolean {
  return getBlobToken() !== null
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // 파일 확장자 검증
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
      return Response.json(
        { error: `Invalid file type: ${extension}` },
        { status: 400 }
      )
    }

    // 파일 크기 검증
    if (file.size > MAX_VIDEO_SIZE) {
      return Response.json(
        { error: "File too large (max 200MB)" },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (isUsingBlob()) {
      // Vercel Blob에 업로드
      const pathname = `videos/temp/${randomUUID()}.${extension}`

      const result = await put(pathname, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 5, // 5 minutes (임시 파일)
        token: getBlobToken()!,
      })

      return Response.json({
        url: result.url,
        pathname: result.pathname,
        contentType: file.type,
        size: buffer.length,
      })
    }

    // Fallback: 로컬 파일 시스템 (blob 없을 때)
    return Response.json(
      { error: "Blob storage not configured" },
      { status: 500 }
    )
  } catch (error) {
    console.error("[upload-video] Error:", error)
    return Response.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
