import sharp from "sharp";
import { uploadBufferToBlob, deleteFromBlob } from "@/lib/blob";
import { ALLOWED_EXTENSIONS, sanitizeFilename } from "@/lib/sanitizeFilename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

type ConvertRequest = {
  sourceUrl?: string;
  sourcePathname?: string;
  originalName?: string;
  baseName?: string;
  fileIndex?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  cleanupSource?: boolean;
};

const QUALITY_MIN = 50;
const QUALITY_MAX = 100;

export async function POST(req: Request) {
  try {
    let payload: ConvertRequest;
    try {
      payload = (await req.json()) as ConvertRequest;
    } catch {
      return Response.json({ error: "invalid_payload" }, { status: 400 });
    }
    const sourceUrl = payload.sourceUrl;

    if (!sourceUrl || typeof sourceUrl !== "string") {
      return Response.json({ error: "no_file" }, { status: 400 });
    }

    const originalName = payload.originalName ?? "";
    const extension = getExtension(originalName || sourceUrl);

    if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
      return Response.json({ error: "unsupported_file" }, { status: 400 });
    }

    const qualityInput = Number.isFinite(payload.quality) ? Number(payload.quality) : 90;
    const quality = Math.max(QUALITY_MIN, Math.min(QUALITY_MAX, qualityInput));
    const maxWidth = Number.isFinite(payload.maxWidth) ? Math.max(1, Number(payload.maxWidth)) : undefined;
    const maxHeight = Number.isFinite(payload.maxHeight) ? Math.max(1, Number(payload.maxHeight)) : undefined;
    const maintainAspectRatio = payload.maintainAspectRatio !== undefined ? Boolean(payload.maintainAspectRatio) : true;
    const fileIndex = Number.isFinite(payload.fileIndex) ? Math.max(1, Math.trunc(Number(payload.fileIndex))) : 1;

    // URL에서 파일 읽기 (로컬 또는 Blob)
    const sourceResponse = await fetch(sourceUrl);
    if (!sourceResponse.ok) {
      return Response.json({ error: "source_not_found" }, { status: 404 });
    }

    const arrayBuffer = await sourceResponse.arrayBuffer();
    if (!arrayBuffer.byteLength) {
      return Response.json({ error: "empty_file" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(arrayBuffer);
    let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();

    // 원본 이미지 메타데이터 확인
    const metadata = await sharp(inputBuffer).metadata();
    
    // 사용자 지정 리사이즈 또는 자동 최적화
    if (maxWidth || maxHeight) {
      // 사용자가 리사이즈를 지정한 경우
      pipeline = pipeline.resize({
        width: maxWidth,
        height: maxHeight,
        fit: maintainAspectRatio ? "inside" : "fill",
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
      quality, // 사용자 설정 품질 (기본 90)
      effort: 6, // 압축 노력도 (0-6, 높을수록 더 압축하지만 느림)
      smartSubsample: true, // 스마트 서브샘플링으로 파일 크기 감소
      nearLossless: false, // 무손실 압축 비활성화 (더 작은 파일)
      alphaQuality: 100, // 투명도 품질 (알파 채널이 있는 경우)
    }).toBuffer();
    
    const requestedBaseName = sanitizeFilename(payload.baseName);
    const safeBaseName = requestedBaseName || "image";
    const fileName = `${safeBaseName}_${fileIndex}.webp`;

    // Blob 또는 로컬 파일 시스템에 저장
    const uploaded = await uploadBufferToBlob({
      buffer: webpBuffer,
      filename: fileName,
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // 소스 파일 정리
    if (payload.cleanupSource !== false && (payload.sourcePathname || payload.sourceUrl)) {
      const target = payload.sourcePathname ?? payload.sourceUrl!;
      await deleteFromBlob(target).catch((error) => {
        console.warn("[api/convert] failed to delete source blob", error);
      });
    }

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
