import { handleDirectUpload } from "@/lib/blob"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return handleDirectUpload(request)
}
