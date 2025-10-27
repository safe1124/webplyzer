import { readFile } from "fs/promises"
import { join } from "path"
import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join("/")
    const filepath = join(process.cwd(), "uploads", path)

    // 경로 탐색 공격 방지
    const normalizedPath = join(process.cwd(), "uploads")
    if (!filepath.startsWith(normalizedPath)) {
      return new Response("Forbidden", { status: 403 })
    }

    const buffer = await readFile(filepath)
    const ext = path.substring(path.lastIndexOf(".")).toLowerCase()
    const contentType = MIME_TYPES[ext] || "application/octet-stream"

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("[static] Error serving file:", error)
    return new Response("Not Found", { status: 404 })
  }
}

