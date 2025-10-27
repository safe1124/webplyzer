import { put, del, type PutBlobResult } from "@vercel/blob"
import { writeFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

const MAX_UPLOAD_SIZE_BYTES = Number(process.env.BLOB_UPLOAD_MAX_SIZE ?? 200 * 1024 * 1024)

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/jfif",
  "image/png",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/webp",
] as const

export const SOURCE_PREFIX = process.env.BLOB_SOURCE_PREFIX ?? "uploads"
export const CONVERTED_PREFIX = process.env.BLOB_CONVERTED_PREFIX ?? "converted"

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null
}

function isUsingBlob(): boolean {
  return getBlobToken() !== null
}

export async function handleDirectUpload(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // MIME 타입 검증
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as any)) {
      return Response.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 }
      )
    }

    // 파일 크기 검증
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return Response.json(
        { error: "File too large (max 200MB)" },
        { status: 400 }
      )
    }

    // Vercel Blob 사용 가능 여부 확인
    if (isUsingBlob()) {
      // Blob에 직접 업로드
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const ext = file.name.split(".").pop() || "jpg"
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      const pathname = `${SOURCE_PREFIX}/${nameWithoutExt}_${randomUUID()}.${ext}`
      
      const result = await put(pathname, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24, // 1 day
        token: getBlobToken()!,
      })

      return Response.json({
        url: result.url,
        pathname: result.pathname,
        contentType: file.type,
        size: file.size,
        downloadUrl: result.downloadUrl,
      })
    }

    // Fallback: 로컬 파일 시스템 사용
    const uploadsDir = join(process.cwd(), "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const ext = file.name.split(".").pop() || "jpg"
    const filename = `${randomUUID()}_${file.name}`
    const filepath = join(uploadsDir, filename)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return Response.json({
      url,
      pathname: filename,
      contentType: file.type,
      size: file.size,
      downloadUrl: url,
    })
  } catch (error) {
    console.error("[blob] direct upload error", error)
    return Response.json(
      { error: "upload_failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

type UploadBufferOptions = {
  buffer: Buffer
  filename: string
  contentType?: string
  cacheControlMaxAge?: number
}

export async function uploadBufferToBlob({
  buffer,
  filename,
  contentType = "image/webp",
  cacheControlMaxAge = 60 * 60 * 24 * 7, // 7 days
}: UploadBufferOptions): Promise<PutBlobResult> {
  if (isUsingBlob()) {
    const pathname = `${CONVERTED_PREFIX}/${filename}`
    return put(pathname, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
      cacheControlMaxAge,
      token: getBlobToken()!,
    })
  }

  // Fallback: 로컬 파일 시스템
  const uploadsDir = join(process.cwd(), "uploads")
  await mkdir(uploadsDir, { recursive: true })
  const filepath = join(uploadsDir, filename)
  await writeFile(filepath, buffer)

  const url = `/uploads/${filename}`
  return {
    url,
    downloadUrl: url,
    pathname: filename,
    contentType,
    contentDisposition: `inline; filename="${filename}"`,
  } as PutBlobResult
}

export async function deleteFromBlob(urlOrPathname: string) {
  if (isUsingBlob()) {
    await del(urlOrPathname, { token: getBlobToken()! })
    return
  }

  // Fallback: 로컬 파일 시스템
  if (urlOrPathname.startsWith("/uploads/")) {
    const filename = urlOrPathname.replace("/uploads/", "")
    const filepath = join(process.cwd(), "uploads", filename)
    await unlink(filepath).catch((error) => {
      console.warn("[blob] failed to delete local file", error)
    })
  }
}
