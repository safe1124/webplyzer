import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export const runtime = "edge"

const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv", "mpeg", "mpg"]

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // 파일 확장자 검증
        const extension = pathname.split(".").pop()?.toLowerCase() || ""
        if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
          throw new Error(`Invalid file type: ${extension}`)
        }

        return {
          allowedContentTypes: ["video/*"],
          tokenPayload: JSON.stringify({
            // 추가 메타데이터
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload-video] Upload completed:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("[upload-video] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    )
  }
}
