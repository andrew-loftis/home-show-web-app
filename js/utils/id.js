// UUID-like generator and short code
export function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
export function genShortCode() {
  return "PC-HS-" + Math.floor(1000 + Math.random() * 9000);
}
