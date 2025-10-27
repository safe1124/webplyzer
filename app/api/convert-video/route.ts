import { NextRequest } from "next/server"
import ffmpeg from "fluent-ffmpeg"
import { writeFile, unlink } from "fs/promises"
import { randomUUID } from "crypto"
import { tmpdir } from "os"
import { join } from "path"
import { execSync } from "child_process"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for video conversion

// Set FFmpeg path for different environments
if (process.env.VERCEL) {
  // Vercel provides FFmpeg at /usr/bin/ffmpeg
  ffmpeg.setFfmpegPath("/usr/bin/ffmpeg")
  ffmpeg.setFfprobePath("/usr/bin/ffprobe")
} else {
  // Local development: try to detect FFmpeg from common paths
  try {
    const ffmpegPath = execSync("which ffmpeg").toString().trim()
    const ffprobePath = execSync("which ffprobe").toString().trim()
    if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
    if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath)
  } catch (error) {
    console.warn("[convert-video] FFmpeg not found in PATH, using system default")
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const bitrateParam = (formData.get("bitrate") as string) || "1M"
    // Remove trailing 'k' or 'K' if present (fluent-ffmpeg adds it automatically)
    const bitrate = bitrateParam.replace(/[kK]$/, "")
    const baseName = (formData.get("baseName") as string) || "video"
    const fileIndex = parseInt((formData.get("fileIndex") as string) || "1", 10)

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert File to Buffer and save to temp file
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create temporary files
    const inputPath = join(tmpdir(), `input-${randomUUID()}.${file.name.split('.').pop() || 'mp4'}`)
    const outputPath = join(tmpdir(), `output-${randomUUID()}.webm`)

    await writeFile(inputPath, buffer)

    return new Promise<Response>((resolve) => {
      ffmpeg(inputPath)
        .outputFormat("webm")
        .videoCodec("libvpx-vp9")
        .audioCodec("libopus")
        .outputOptions([
          `-b:v ${bitrate}`,
          "-b:a 128k",
          "-deadline realtime",
          "-cpu-used 4",
        ])
        .on("start", (commandLine) => {
          console.log("[FFmpeg] Started:", commandLine)
        })
        .on("progress", (progress) => {
          console.log(`[FFmpeg] Processing: ${progress.percent}% done`)
        })
        .on("error", async (err) => {
          console.error("[FFmpeg] Error:", err)
          // Cleanup temp files
          await unlink(inputPath).catch(() => {})
          await unlink(outputPath).catch(() => {})
          resolve(
            Response.json(
              { error: "video_conversion_failed", details: err.message },
              { status: 500 }
            )
          )
        })
        .on("end", async () => {
          console.log("[FFmpeg] Conversion finished")

          try {
            // Read output file
            const { readFile } = await import("fs/promises")
            const outputBuffer = await readFile(outputPath)

            // Cleanup temp files
            await unlink(inputPath).catch(() => {})
            await unlink(outputPath).catch(() => {})

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
          } catch (error) {
            console.error("[FFmpeg] Error reading output:", error)
            await unlink(inputPath).catch(() => {})
            await unlink(outputPath).catch(() => {})
            resolve(
              Response.json(
                { error: "video_conversion_failed", details: "Failed to read output file" },
                { status: 500 }
              )
            )
          }
        })
        .save(outputPath)
    })
  } catch (error) {
    console.error("[convert-video] Error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
