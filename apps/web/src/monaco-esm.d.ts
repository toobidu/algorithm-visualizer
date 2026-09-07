/**
 * Monaco không ship khai báo kiểu cho các điểm vào ESM chi tiết, chỉ cho gói tổng.
 * Khai báo lại ở đây để dùng được bản nạp có chọn lọc mà vẫn giữ nguyên kiểu —
 * tốt hơn nhiều so với ép `any` hay tắt kiểm tra (PLAN.md §5.9).
 */
declare module 'monaco-editor/esm/vs/editor/edcore.main' {
  export * from 'monaco-editor';
}

/** Các contribution chỉ có tác dụng phụ, không xuất gì. */
declare module 'monaco-editor/esm/vs/basic-languages/*/*.contribution';
declare module 'monaco-editor/esm/vs/editor/contrib/*/browser/*';
