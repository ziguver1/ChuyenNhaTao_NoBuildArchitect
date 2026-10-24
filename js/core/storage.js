/**
 * Quản lý lưu trữ cục bộ (localStorage)
 * Prefix 'cnt_' cho tất cả các key của Chuyện Nhà Táo
 */
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('cnt_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem('cnt_' + key, JSON.stringify(val));
    } catch (e) {
      /* bỏ qua */
    }
  },
  clear() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('cnt_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      /* bỏ qua */
    }
  }
};
