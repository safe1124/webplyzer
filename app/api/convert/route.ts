import sharp from "sharp";
import { uploadBufferToBlob } from "@/lib/blob";
import { ALLOWED_EXTENSIONS, sanitizeFilename, MAX_FILE_SIZE_BYTES } from "@/lib/sanitizeFilename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

const QUALITY_MIN = 50;
const QUALITY_MAX = 100;

export async function POST(req: Request) {
  try {
    // FormData 파싱
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const baseName = formData.get("baseName") as string | null;
    const fileIndex = formData.get("fileIndex") as string | null;
    const quality = formData.get("quality") as string | null;
    const maxWidth = formData.get("maxWidth") as string | null;
    const maxHeight = formData.get("maxHeight") as string | null;
    const maintainAspectRatio = formData.get("maintainAspectRatio") as string | null;

    // 파일 검증
    if (!file) {
      return Response.json({ error: "no_file" }, { status: 400 });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: "file_too_large" }, { status: 400 });
    }

    // 확장자 검증
    const extension = getExtension(file.name);
    if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
      return Response.json({ error: "unsupported_file" }, { status: 400 });
    }

    // 파라미터 파싱
    const qualityInput = quality ? Number(quality) : 90;
    const qualityValue = Math.max(QUALITY_MIN, Math.min(QUALITY_MAX, qualityInput));
    const maxWidthValue = maxWidth ? Math.max(1, Number(maxWidth)) : undefined;
    const maxHeightValue = maxHeight ? Math.max(1, Number(maxHeight)) : undefined;
    const maintainAspectRatioValue = maintainAspectRatio !== "false";
    const fileIndexValue = fileIndex ? Math.max(1, Math.trunc(Number(fileIndex))) : 1;

    // 파일을 메모리에서 Buffer로 읽기 (Blob 저장 없이)
    const arrayBuffer = await file.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return Response.json({ error: "empty_file" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(arrayBuffer);
    let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();

    // 원본 이미지 메타데이터 확인
    const metadata = await sharp(inputBuffer).metadata();

    // 사용자 지정 리사이즈 또는 자동 최적화
    if (maxWidthValue || maxHeightValue) {
      // 사용자가 리사이즈를 지정한 경우
      pipeline = pipeline.resize({
        width: maxWidthValue,
        height: maxHeightValue,
        fit: maintainAspectRatioValue ? "inside" : "fill",
        withoutEnlargement: true,
      });
    } else if (metadata.width && metadata.height) {
      // 자동 최적화: 4K 이상 이미지는 자동으로 축소
      const MAX_DIMENSION = 3840; // 4K 해상도
      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        pipeline = pipeline.resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }

    // WebP 압축 옵션 최적화
    const webpBuffer = await pipeline.webp({
      quality: qualityValue, // 사용자 설정 품질 (기본 90)
      effort: 6, // 압축 노력도 (0-6, 높을수록 더 압축하지만 느림)
      smartSubsample: true, // 스마트 서브샘플링으로 파일 크기 감소
      nearLossless: false, // 무손실 압축 비활성화 (더 작은 파일)
      alphaQuality: 100, // 투명도 품질 (알파 채널이 있는 경우)
    }).toBuffer();

    const requestedBaseName = sanitizeFilename(baseName || "");
    const safeBaseName = requestedBaseName || "image";
    const fileName = `${safeBaseName}_${fileIndexValue}.webp`;

    // 변환된 WebP만 Blob에 저장 (1회 Advanced Operation)
    const uploaded = await uploadBufferToBlob({
      buffer: webpBuffer,
      filename: fileName,
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return Response.json({
      ok: true,
      name: fileName,
      url: uploaded.url,
      downloadUrl: uploaded.downloadUrl,
      pathname: uploaded.pathname,
    });
  } catch (error) {
    console.error("[api/convert] error", error);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
