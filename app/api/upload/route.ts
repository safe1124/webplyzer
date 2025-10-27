import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Generate a client token for the browser to upload the file
        // Make sure to authenticate and authorize users before generating the token.
        
        return {
          allowedContentTypes: [
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
          ],
          maximumSizeInBytes: 20 * 1024 * 1024, // 20MB
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Called by Vercel API on client upload completion
        console.log("[upload] blob upload completed", blob.url)

        // You can run any logic after the file upload completed
        // For example, update database with the blob URL
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
