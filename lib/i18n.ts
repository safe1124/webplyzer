export type Locale = "ja" | "en" | "ko";

type MessageKey =
  | "title"
  | "filename_label"
  | "filename_placeholder"
  | "upload_label"
  | "add_more"
  | "convert_button"
  | "converting"
  | "selected_files"
  | "files_unit"
  | "max"
  | "success_message"
  | "error"
  | "max_25_files"
  | "no_file_selected"
  | "remove"
  | "order_list"
  | "drag_to_reorder"
  | "footer_text"
  | "file_removed"
  | "conversion_error"
  | "unsupported_file"
  | "quality_label"
  | "resize_label"
  | "enable_resize"
  | "max_width"
  | "max_height"
  | "maintain_aspect_ratio"
  | "options_title";

type Messages = Record<MessageKey, string>;

export const messages: Record<Locale, Messages> = {
  ja: {
    title: "Webplyzer - WebP一括変換ツール",
    filename_label: "変換後のベースファイル名",
    filename_placeholder: "例: product-image",
    upload_label: "画像を選択またはドラッグ＆ドロップ",
    add_more: "さらに追加",
    convert_button: "WebPに変換",
    converting: "変換中",
    selected_files: "選択中のファイル",
    files_unit: "件",
    max: "上限",
    success_message: "変換が完了しました。",
    error: "エラー",
    max_25_files: "最大25ファイルまでアップロードできます",
    no_file_selected: "ファイルが選択されていません",
    remove: "削除",
    order_list: "変換順序",
    drag_to_reorder: "ドラッグで順序を変更できます",
    footer_text: "© Webplyzer – 画像最適化をもっとスマートに",
    file_removed: "ファイルを削除しました",
    conversion_error: "変換に失敗しました。再度お試しください。",
    unsupported_file: "このファイル形式はサポートされていません（JPG/JPEG/PNGのみ）。",
    quality_label: "品質",
    resize_label: "リサイズ",
    enable_resize: "リサイズを有効にする",
    max_width: "最大幅 (px)",
    max_height: "最大高さ (px)",
    maintain_aspect_ratio: "縦横比を維持",
    options_title: "変換オプション",
  },
  en: {
    title: "Webplyzer - Batch WebP Converter",
    filename_label: "Base filename for converted images",
    filename_placeholder: "e.g. product-image",
    upload_label: "Select or drag & drop images",
    add_more: "Add more",
    convert_button: "Convert to WebP",
    converting: "Converting",
    selected_files: "Selected files",
    files_unit: "items",
    max: "max",
    success_message: "Conversion completed successfully.",
    error: "Error",
    max_25_files: "You can upload up to 25 files",
    no_file_selected: "No files selected",
    remove: "Remove",
    order_list: "Processing order",
    drag_to_reorder: "Drag to change the order",
    footer_text: "© Webplyzer – Smart image optimization",
    file_removed: "File removed",
    conversion_error: "Conversion failed. Please try again.",
    unsupported_file: "Only JPG, JPEG, or PNG files are supported.",
    quality_label: "Quality",
    resize_label: "Resize",
    enable_resize: "Enable resize",
    max_width: "Max width (px)",
    max_height: "Max height (px)",
    maintain_aspect_ratio: "Maintain aspect ratio",
    options_title: "Conversion Options",
  },
  ko: {
    title: "Webplyzer - WebP 일괄 변환 도구",
    filename_label: "변환된 이미지의 기본 파일명",
    filename_placeholder: "예: product-image",
    upload_label: "이미지를 선택하거나 드래그 앤 드롭하세요",
    add_more: "더 추가",
    convert_button: "WebP로 변환",
    converting: "변환 중",
    selected_files: "선택된 파일",
    files_unit: "개",
    max: "최대",
    success_message: "변환이 완료되었습니다.",
    error: "오류",
    max_25_files: "최대 25개의 파일을 업로드할 수 있습니다",
    no_file_selected: "선택된 파일이 없습니다",
    remove: "삭제",
    order_list: "변환 순서",
    drag_to_reorder: "드래그하여 순서를 변경하세요",
    footer_text: "© Webplyzer – 더 스마트한 이미지 최적화",
    file_removed: "파일이 삭제되었습니다",
    conversion_error: "변환에 실패했습니다. 다시 시도하세요.",
    unsupported_file: "JPG, JPEG, PNG 파일만 지원됩니다.",
    quality_label: "품질",
    resize_label: "리사이즈",
    enable_resize: "리사이즈 활성화",
    max_width: "최대 너비 (px)",
    max_height: "최대 높이 (px)",
    maintain_aspect_ratio: "비율 유지",
    options_title: "변환 옵션",
  },
};

export const localeOptions: Array<{ code: Locale; label: string; emoji: string }> =
  [
    { code: "ja", label: "日本語", emoji: "🇯🇵" },
    { code: "en", label: "English", emoji: "🇺🇸" },
    { code: "ko", label: "한국어", emoji: "🇰🇷" },
  ];
