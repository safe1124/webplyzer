export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const hasToken = Boolean(token)
  const sourcePrefix = process.env.BLOB_SOURCE_PREFIX ?? "uploads"
  const convertedPrefix = process.env.BLOB_CONVERTED_PREFIX ?? "converted"
  const maxSize = Number(process.env.BLOB_UPLOAD_MAX_SIZE ?? 200 * 1024 * 1024)

  return Response.json({
    ok: true,
    hasToken,
    sourcePrefix,
    convertedPrefix,
    maxSize,
  })
}

