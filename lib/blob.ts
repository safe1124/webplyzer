import { put, del, type PutBlobResult } from "@vercel/blob"
import { writeFile, unlink, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import sharp from "sharp"

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
    const isValidMimeType = ALLOWED_UPLOAD_MIME_TYPES.some(
      (allowedType) => allowedType === file.type
    )
    if (!isValidMimeType) {
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

    // 원본 이미지 압축 (Blob 저장 용량 절감)
    const bytes = await file.arrayBuffer()
    let buffer: Buffer = Buffer.from(bytes)

    // 이미지 압축 (JPEG/PNG만, 품질 85로 압축)
    const isCompressible = ["image/jpeg", "image/jpg", "image/png"].includes(file.type)
    if (isCompressible) {
      try {
        const image = sharp(buffer)
        const metadata = await image.metadata()
        
        // 4K 이상 이미지는 자동 리사이즈
        const MAX_DIMENSION = 3840
        let resizedImage = image
        
        if (metadata.width && metadata.height && 
            (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)) {
          resizedImage = image.resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
          })
        }
        
        // JPEG로 압축 (품질 85, 최적화)
        const compressed = await resizedImage
          .jpeg({ quality: 85, progressive: true, mozjpeg: true })
          .toBuffer()
        buffer = Buffer.from(compressed.buffer as ArrayBuffer)
      } catch (error) {
        console.warn("[blob] Image compression failed, using original:", error)
        // 압축 실패 시 원본 사용
      }
    }

    // Vercel Blob 사용 가능 여부 확인
    if (isUsingBlob()) {
      const ext = file.name.split(".").pop() || "jpg"
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "")
      const pathname = `${SOURCE_PREFIX}/${nameWithoutExt}_${randomUUID()}.${ext}`
      
      const result = await put(pathname, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24, // 1 day
        token: getBlobToken()!,
        // 원본 파일은 1시간 후 자동 삭제 (Advanced Operation 절약)
        // 변환에 충분한 시간을 주고 자동으로 정리됨
        // 참고: TTL은 Advanced Operation을 소모하지 않음
      })

      return Response.json({
        url: result.url,
        pathname: result.pathname,
        contentType: file.type,
        size: buffer.length, // 압축된 크기
        downloadUrl: result.downloadUrl,
      })
    }

    // Fallback: 로컬 파일 시스템 사용
    const uploadsDir = join(process.cwd(), "uploads")
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${randomUUID()}_${file.name}`
    const filepath = join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return Response.json({
      url,
      pathname: filename,
      contentType: file.type,
      size: buffer.length, // 압축된 크기
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
