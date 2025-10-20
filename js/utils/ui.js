// Modal, Toast, Spinner
export function Modal(content, opts = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm";
  if (!opts.preventClose) {
    overlay.onclick = () => closeModal();
  }
  const panel = document.createElement("div");
  panel.className = `glass-card rounded-xl p-6 shadow-xl max-w-md w-full mx-4 fade-in ${opts.size === 'large' ? 'max-w-2xl' : ''}`;
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

// Custom confirmation dialogs
export function ConfirmDialog(title, message, options = {}) {
  return new Promise((resolve) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full ${options.danger ? 'bg-red-500/20' : 'bg-blue-500/20'} flex items-center justify-center">
          <ion-icon name="${options.danger ? 'warning-outline' : 'help-circle-outline'}" class="text-3xl ${options.danger ? 'text-red-400' : 'text-blue-400'}"></ion-icon>
        </div>
        <h3 class="text-lg font-semibold text-glass mb-2">${title}</h3>
        <p class="text-glass-secondary text-sm mb-6 whitespace-pre-line">${message}</p>
        <div class="flex gap-3 justify-center">
          <button class="glass-button px-6 py-2 rounded" id="cancel-btn">
            ${options.cancelText || 'Cancel'}
          </button>
          <button class="${options.danger ? 'bg-red-600 hover:bg-red-700' : 'brand-bg'} px-6 py-2 rounded text-white" id="confirm-btn">
            ${options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    `;
    
    Modal(content, { preventClose: true });
    
    content.querySelector('#cancel-btn').onclick = () => {
      closeModal();
      resolve(false);
    };
    
    content.querySelector('#confirm-btn').onclick = () => {
      closeModal();
      resolve(true);
    };
  });
}

export function TypedConfirmDialog(title, message, requiredText, options = {}) {
  return new Promise((resolve) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <ion-icon name="nuclear-outline" class="text-3xl text-red-400"></ion-icon>
        </div>
        <h3 class="text-lg font-semibold text-red-400 mb-2">${title}</h3>
        <div class="text-glass-secondary text-sm mb-4 whitespace-pre-line text-left">${message}</div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-glass-secondary mb-2">
            Type "<span class="font-bold text-red-400">${requiredText}</span>" to confirm:
          </label>
          <input type="text" id="confirm-input" class="w-full px-3 py-2 rounded border border-white/20 bg-white/10 text-glass placeholder-glass-secondary/50" placeholder="${requiredText}">
        </div>
        <div class="flex gap-3 justify-center">
          <button class="glass-button px-6 py-2 rounded" id="cancel-btn">Cancel</button>
          <button class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded text-white opacity-50 cursor-not-allowed" id="confirm-btn" disabled>
            ${options.confirmText || 'Delete'}
          </button>
        </div>
      </div>
    `;
    
    Modal(content, { preventClose: true, size: 'large' });
    
    const input = content.querySelector('#confirm-input');
    const confirmBtn = content.querySelector('#confirm-btn');
    
    input.oninput = () => {
      const isValid = input.value === requiredText;
      confirmBtn.disabled = !isValid;
      confirmBtn.classList.toggle('opacity-50', !isValid);
      confirmBtn.classList.toggle('cursor-not-allowed', !isValid);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && input.value === requiredText) {
        closeModal();
        resolve(true);
      }
    };
    
    content.querySelector('#cancel-btn').onclick = () => {
      closeModal();
      resolve(false);
    };
    
    confirmBtn.onclick = () => {
      if (input.value === requiredText) {
        closeModal();
        resolve(true);
      }
    };
    
    // Focus the input
    setTimeout(() => input.focus(), 100);
  });
}

export function AlertDialog(title, message, options = {}) {
  return new Promise((resolve) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full ${options.type === 'error' ? 'bg-red-500/20' : options.type === 'success' ? 'bg-green-500/20' : 'bg-blue-500/20'} flex items-center justify-center">
          <ion-icon name="${options.type === 'error' ? 'close-circle-outline' : options.type === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'}" class="text-3xl ${options.type === 'error' ? 'text-red-400' : options.type === 'success' ? 'text-green-400' : 'text-blue-400'}"></ion-icon>
        </div>
        <h3 class="text-lg font-semibold text-glass mb-2">${title}</h3>
        <p class="text-glass-secondary text-sm mb-6 whitespace-pre-line">${message}</p>
        <button class="brand-bg px-6 py-2 rounded text-white" id="ok-btn">
          ${options.okText || 'OK'}
        </button>
      </div>
    `;
    
    Modal(content);
    
    content.querySelector('#ok-btn').onclick = () => {
      closeModal();
      resolve();
    };
  });
}
