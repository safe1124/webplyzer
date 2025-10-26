import JSZip from "jszip";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { ALLOWED_EXTENSIONS, MAX_FILES, sanitizeFilename } from "@/lib/sanitizeFilename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const baseName = sanitizeFilename(formData.get("base_name")?.toString());
    const files = formData.getAll("files") as File[];
    const fileIndexOverride = Number(formData.get("file_index"));

    if (!files.length) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: "too_many_files" }, { status: 400 });
    }

    const converted: Array<{ name: string; buffer: Buffer }> = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const extension = getExtension(file.name);

      if (!ALLOWED_EXTENSIONS.has(extension)) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      const webpBuffer = await sharp(inputBuffer, { failOn: "none" })
        .rotate()
        .webp({ quality: 90 })
        .toBuffer();

      const ordinal =
        Number.isFinite(fileIndexOverride) && files.length === 1
          ? Math.max(1, Math.trunc(fileIndexOverride))
          : index + 1;

      converted.push({
        name: `${baseName}_${ordinal}.webp`,
        buffer: webpBuffer,
      });
    }

    if (!converted.length) {
      return NextResponse.json({ error: "no_valid_files" }, { status: 400 });
    }

    if (converted.length === 1) {
      const [single] = converted;
      return new NextResponse(single.buffer, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Content-Disposition": `attachment; filename="${single.name}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const zip = new JSZip();
    converted.forEach((file) => {
      zip.file(file.name, file.buffer);
    });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${baseName}_webp.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/convert] error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
