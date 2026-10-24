/**
 * Các hàm tiện ích thao tác DOM và chuỗi ký tự
 */

export const $ = (s, r = document) => r.querySelector(s);

export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

// Bỏ dấu, viết hoa: so tên trùng và chữ xác nhận không phụ thuộc cách gõ dấu
export const plain = (v) =>
  String(v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
