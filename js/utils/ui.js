// Modal, Toast, Spinner
export function Modal(content, opts = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50";
  overlay.onclick = () => closeModal();
  const panel = document.createElement("div");
  panel.className = "bg-white rounded-xl p-6 shadow-xl max-w-md w-full fade-in";
  panel.onclick = e => e.stopPropagation();
  panel.appendChild(content);
  overlay.appendChild(panel);
  root.appendChild(overlay);
}
export function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}
export function Toast(msg, opts = {}) {
  const root = document.getElementById("toast-root");
  const toast = document.createElement("div");
  toast.className = "fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-2 rounded shadow fade-in z-50";
  toast.textContent = msg;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), opts.duration || 2200);
}
export function Spinner() {
  const spin = document.createElement("div");
  spin.className = "animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto";
  return spin;
}
