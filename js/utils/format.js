// Formatting helpers
export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export function formatNumber(n) {
  return n.toLocaleString();
}
