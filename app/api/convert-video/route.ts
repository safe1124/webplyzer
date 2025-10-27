import { NextRequest } from "next/server"
import ffmpeg from "fluent-ffmpeg"
import { writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"
import { randomUUID } from "crypto"
import { tmpdir } from "os"
import { join } from "path"
import { execSync } from "child_process"
import { del } from "@vercel/blob"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for video conversion

type BinaryName = "ffmpeg" | "ffprobe"

const BINARY_FALLBACK_PATHS: Record<BinaryName, string[]> = {
  ffmpeg: [
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
    "/bin/ffmpeg",
    "/var/task/bin/ffmpeg",
    "/var/task/ffmpeg",
  ],
  ffprobe: [
    "/usr/local/bin/ffprobe",
    "/usr/bin/ffprobe",
    "/bin/ffprobe",
    "/var/task/bin/ffprobe",
    "/var/task/ffprobe",
  ],
}

const bundledFfmpegPath = loadBundledBinary("@ffmpeg-installer/ffmpeg")
const bundledFfprobePath = loadBundledBinary("@ffprobe-installer/ffprobe")

let resolvedFfmpeg:
  | {
      path: string
      source: string
    }
  | null = null
let resolvedFfprobe:
  | {
      path: string
      source: string
    }
  | null = null

let ffmpegSetupError: Error | null = null
let ffprobeSetupError: Error | null = null

try {
  resolvedFfmpeg = resolveBinary("ffmpeg", {
    envPath: process.env.FFMPEG_PATH,
    bundledPath: bundledFfmpegPath,
  })
  ffmpeg.setFfmpegPath(resolvedFfmpeg.path)
  console.log(`[convert-video] Using ffmpeg binary (${resolvedFfmpeg.source}): ${resolvedFfmpeg.path}`)
} catch (error) {
  ffmpegSetupError = error instanceof Error ? error : new Error(String(error))
  console.error("[convert-video] FFmpeg binary resolution failed:", ffmpegSetupError)
}

try {
  resolvedFfprobe = resolveBinary("ffprobe", {
    envPath: process.env.FFPROBE_PATH,
    bundledPath: bundledFfprobePath,
  })
  ffmpeg.setFfprobePath(resolvedFfprobe.path)
  console.log(`[convert-video] Using ffprobe binary (${resolvedFfprobe.source}): ${resolvedFfprobe.path}`)
} catch (error) {
  ffprobeSetupError = error instanceof Error ? error : new Error(String(error))
  console.error("[convert-video] FFprobe binary resolution failed:", ffprobeSetupError)
}

function loadBundledBinary(
  moduleId: "@ffmpeg-installer/ffmpeg" | "@ffprobe-installer/ffprobe"
): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const installer = require(moduleId) as { path?: string }
    if (typeof installer?.path === "string") {
      return installer.path
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[convert-video] ${moduleId} not available: ${message}`)
  }
  return undefined
}

function tryWhich(binaryName: BinaryName): string | undefined {
  try {
    const result = execSync(`which ${binaryName}`).toString().trim()
    return result || undefined
  } catch {
    return undefined
  }
}

function resolveBinary(
  binaryName: BinaryName,
  options: {
    envPath?: string | null
    bundledPath?: string | undefined
  }
): { path: string; source: string } {
  const candidates: Array<{ path: string; source: string }> = []

  const envPath = options.envPath?.trim()
  if (envPath) {
    candidates.push({ path: envPath, source: "env" })
  }

  const systemPath = tryWhich(binaryName)
  if (systemPath) {
    candidates.push({ path: systemPath, source: "system" })
  }

  if (options.bundledPath) {
    candidates.push({ path: options.bundledPath, source: "bundled" })
  }

  const installerPath = getInstallerBinaryPath(binaryName)
  if (installerPath) {
    candidates.push(installerPath)
  }

  for (const fallbackPath of BINARY_FALLBACK_PATHS[binaryName]) {
    candidates.push({ path: fallbackPath, source: "fallback" })
  }

  for (const candidate of candidates) {
    if (!candidate.path) continue
    try {
      if (existsSync(candidate.path)) {
        return candidate
      }
    } catch {
      // Ignore filesystem access errors and try next candidate
    }
  }

  const inspected =
    candidates.length > 0
      ? candidates.map((candidate) => `${candidate.source}:${candidate.path}`).join(", ")
      : "none"

  throw new Error(`Unable to locate ${binaryName} binary. Checked ${inspected}`)
}

function getInstallerBinaryPath(binaryName: BinaryName):
  | {
      path: string
      source: string
    }
  | null {
  const namespace =
    binaryName === "ffmpeg" ? "@ffmpeg-installer" : "@ffprobe-installer"

  const platform = process.platform
  const arch = process.arch

  let target: string | null = null

  if (platform === "linux") {
    if (arch === "x64" || arch === "ia32" || arch === "arm" || arch === "arm64") {
      target = `linux-${arch}`
    }
  } else if (platform === "darwin") {
    if (arch === "x64" || arch === "arm64") {
      target = `darwin-${arch}`
    }
  } else if (platform === "win32") {
    if (arch === "x64" || arch === "ia32") {
      target = `win32-${arch}`
    }
  }

  if (!target) {
    return null
  }

  const binaryFilename = platform === "win32" ? `${binaryName}.exe` : binaryName
  const candidateBases = [
    join(process.cwd(), "node_modules", namespace, target, binaryFilename),
    join(process.cwd(), ".next", "server", "node_modules", namespace, target, binaryFilename),
  ]

  for (const candidatePath of candidateBases) {
    if (!candidatePath) continue
    try {
      if (existsSync(candidatePath)) {
        return { path: candidatePath, source: "installer" }
      }
    } catch {
      // Ignore and continue
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  if (ffmpegSetupError || ffprobeSetupError) {
    const reasons = [
      ffmpegSetupError ? `ffmpeg: ${ffmpegSetupError.message}` : null,
      ffprobeSetupError ? `ffprobe: ${ffprobeSetupError.message}` : null,
    ]
      .filter(Boolean)
      .join(" | ")

    return Response.json(
      {
        error: "video_conversion_failed",
        details: reasons || "FFmpeg/FFprobe binaries could not be resolved",
      },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const blobUrl = (formData.get("blobUrl") as string) || ""
    const blobPathname = (formData.get("blobPathname") as string) || ""
    const bitrateParam = (formData.get("bitrate") as string) || "1M"
    // Remove trailing 'k' or 'K' if present (fluent-ffmpeg adds it automatically)
    const bitrate = bitrateParam.replace(/[kK]$/, "")
    const baseName = (formData.get("baseName") as string) || "video"
    const fileIndex = parseInt((formData.get("fileIndex") as string) || "1", 10)
    const originalExtension = (formData.get("extension") as string) || "mp4"

    if (!blobUrl) {
      return Response.json({ error: "No blob URL provided" }, { status: 400 })
    }

    // Fetch video from Blob URL
    const response = await fetch(blobUrl)
    if (!response.ok) {
      return Response.json({ error: "Failed to fetch video from Blob" }, { status: 400 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create temporary files
    const inputPath = join(tmpdir(), `input-${randomUUID()}.${originalExtension}`)
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

            // Delete from Blob storage if pathname provided
            if (blobPathname) {
              try {
                await del(blobPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
                console.log(`[convert-video] Deleted Blob: ${blobPathname}`)
              } catch (error) {
                console.warn(`[convert-video] Failed to delete Blob: ${blobPathname}`, error)
              }
            }

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
