import { NextRequest } from "next/server"
import ffmpeg from "fluent-ffmpeg"
import { Readable } from "stream"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for video conversion

// Set FFmpeg path for Vercel
if (process.env.VERCEL) {
  // Vercel provides FFmpeg at /usr/bin/ffmpeg
  ffmpeg.setFfmpegPath("/usr/bin/ffmpeg")
  ffmpeg.setFfprobePath("/usr/bin/ffprobe")
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bitrate = (formData.get("bitrate") as string) || "1M"
    const baseName = (formData.get("baseName") as string) || "video"
    const fileIndex = parseInt((formData.get("fileIndex") as string) || "1", 10)

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Convert Buffer to Readable Stream
    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)

    // Create output buffer
    const chunks: Buffer[] = []

    return new Promise<Response>((resolve, reject) => {
      const command = ffmpeg(readableStream)
        .outputFormat("webm")
        .videoCodec("libvpx-vp9")
        .videoBitrate(bitrate)
        .audioCodec("libopus")
        .audioBitrate("128k")
        .on("start", (commandLine) => {
          console.log("[FFmpeg] Started:", commandLine)
        })
        .on("progress", (progress) => {
          console.log(`[FFmpeg] Processing: ${progress.percent}% done`)
        })
        .on("error", (err) => {
          console.error("[FFmpeg] Error:", err)
          resolve(
            Response.json(
              { error: "video_conversion_failed", details: err.message },
              { status: 500 }
            )
          )
        })
        .on("end", () => {
          console.log("[FFmpeg] Conversion finished")
          const outputBuffer = Buffer.concat(chunks)

          if (outputBuffer.length === 0) {
            resolve(
              Response.json(
                { error: "video_conversion_failed", details: "Empty output buffer" },
                { status: 500 }
              )
            )
            return
          }

          const outputName = `${baseName}_${fileIndex}.webm`
          resolve(
            new Response(outputBuffer, {
              status: 200,
              headers: {
                "Content-Type": "video/webm",
                "Content-Disposition": `attachment; filename="${outputName}"`,
                "Content-Length": outputBuffer.length.toString(),
              },
            })
          )
        })

      const stream = command.pipe()
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk)
      })
      stream.on("error", (err) => {
        console.error("[FFmpeg] Stream error:", err)
        reject(err)
      })
    })
  } catch (error) {
    console.error("[convert-video] Error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
