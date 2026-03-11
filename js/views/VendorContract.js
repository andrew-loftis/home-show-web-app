import { getState } from "../store.js";
import { Toast } from "../utils/ui.js";
import { navigate } from "../router.js";
import { getCurrentShowId } from "../shows.js";
import { mergeDuplicateVendors } from "../utils/vendorMerge.js";
import {
  getVendorContractUrl,
  isVendorContractSigned,
  formatVendorContractSignedAt,
  VENDOR_CONTRACT_TERMS,
  VENDOR_CONTRACT_VERSION
} from "../utils/vendorContract.js";

function escHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function resolveVendorForCurrentUser(state) {
  if (!state.user || state.user.isAnonymous) return null;

  const { getDb, claimVendorAccountByEmail } = await import("../firebase.js");
  const db = getDb();
  const { collection, query, where, getDocs, limit, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");

  if (state.isAdmin && state.vendorLoginId) {
    const adminSelected = await getDoc(doc(db, "vendors", state.vendorLoginId));
    if (adminSelected.exists()) {
      return { id: adminSelected.id, ...adminSelected.data() };
    }
  }

  const vendorsRef = collection(db, "vendors");
  const byOwner = query(vendorsRef, where("ownerUid", "==", state.user.uid), limit(20));
  let snap = await getDocs(byOwner);

  if (snap.empty) {
    await claimVendorAccountByEmail({ showId: getCurrentShowId(), silent: true });
    snap = await getDocs(byOwner);
  }

  if (snap.empty && state.user.email) {
    const fallback = query(vendorsRef, where("contactEmail", "==", String(state.user.email).toLowerCase()), limit(20));
    snap = await getDocs(fallback);
  }

  if (snap.empty) return null;
  const owned = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  return mergeDuplicateVendors(owned, { fallbackShowId: getCurrentShowId() }).vendors[0] || owned[0];
}

function normalizeCanvasPoint(canvas, evt) {
  const rect = canvas.getBoundingClientRect();
  const clientX = evt.clientX ?? (evt.touches?.[0]?.clientX || 0);
  const clientY = evt.clientY ?? (evt.touches?.[0]?.clientY || 0);
  const scaleX = canvas.width / Math.max(rect.width, 1);
  const scaleY = canvas.height / Math.max(rect.height, 1);
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

export default async function VendorContract(root) {
  const state = getState();
  if (!state.user || state.user.isAnonymous) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center py-12">
          <h2 class="text-xl font-bold mb-2 text-glass">Sign In Required</h2>
          <p class="text-glass-secondary mb-6">Please sign in with your vendor account to sign the contract.</p>
          <button class="brand-bg px-6 py-3 rounded" onclick="window.location.hash='/more'">Go to Sign In</button>
        </div>
      </div>
    `;
    return;
  }

  let vendor = null;
  try {
    vendor = await resolveVendorForCurrentUser(state);
  } catch (error) {
    console.error("[VendorContract] Failed to load vendor:", error);
  }

  if (!vendor) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="text-center py-12">
          <h2 class="text-xl font-bold mb-2 text-glass">Vendor Profile Not Found</h2>
          <p class="text-glass-secondary mb-6">We could not find a vendor profile connected to this account.</p>
          <button class="glass-button px-6 py-3" onclick="window.location.hash='/vendor-registration'">Start Vendor Registration</button>
        </div>
      </div>
    `;
    return;
  }

  const contractUrl = getVendorContractUrl(vendor);
  const alreadySigned = isVendorContractSigned(vendor);
  const signedAtLabel = formatVendorContractSignedAt(vendor.contractSignedAt);
  const lockForVendor = alreadySigned && !state.isAdmin;

  const defaultSignerName =
    String(vendor.contractSignerName || "").trim()
    || String(vendor.contactName || "").trim()
    || String(state.user.displayName || "").trim()
    || String(vendor.name || vendor.companyName || "").trim();
  const defaultMode = String(vendor.contractSignatureMode || "draw").toLowerCase() === "type" ? "type" : "draw";
  const defaultTyped = String(vendor.contractSignatureTyped || defaultSignerName || "").trim();
  const defaultDrawn = String(vendor.contractSignatureImage || "").trim();

  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="mb-4 flex items-center justify-between gap-2">
        <button class="flex items-center gap-2 text-glass-secondary hover:text-glass transition-colors" onclick="window.location.hash='/vendor-dashboard'">
          <ion-icon name="arrow-back-outline"></ion-icon>
          <span>Back</span>
        </button>
        <span class="text-xs px-2 py-1 rounded ${alreadySigned ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}">
          ${alreadySigned ? "Signed" : "Signature Required"}
        </span>
      </div>

      <div class="glass-card p-5 mb-4 border ${alreadySigned ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"}">
        <h2 class="text-lg font-bold ${alreadySigned ? "text-emerald-300" : "text-red-300"}">
          ${alreadySigned ? "Contract On File" : "Vendor Contract Must Be Signed"}
        </h2>
        <p class="text-sm text-glass-secondary mt-1">
          ${alreadySigned
            ? `Signed by ${escHtml(vendor.contractSignerName || "Vendor")} ${signedAtLabel ? `on ${escHtml(signedAtLabel)}` : ""}.`
            : "Complete this digital signature to finalize your vendor compliance status."}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a href="${contractUrl}" target="_blank" rel="noopener" class="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm">
            <ion-icon name="document-text-outline" class="mr-1"></ion-icon>View Source Contract
          </a>
          <button class="glass-button px-3 py-2 text-sm" onclick="window.location.hash='/edit-vendor'">
            <ion-icon name="create-outline" class="mr-1"></ion-icon>Edit Vendor Profile
          </button>
        </div>
      </div>

      <div class="glass-card p-5 mb-4">
        <h3 class="font-semibold text-glass mb-3">Contract Summary</h3>
        <div class="space-y-3 text-sm text-glass-secondary max-h-72 overflow-y-auto pr-1">
          ${VENDOR_CONTRACT_TERMS.map((item) => `
            <div>
              <p class="font-semibold text-glass">${escHtml(item.title)}</p>
              <p>${escHtml(item.body)}</p>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="font-semibold text-glass mb-3">Digital Signature</h3>

        ${lockForVendor ? `
          <p class="text-sm text-glass-secondary mb-3">This contract is locked as signed. Contact an admin to make corrections.</p>
          ${defaultMode === "draw" && defaultDrawn ? `
            <div class="rounded border border-white/20 bg-white p-2 max-w-md">
              <img src="${defaultDrawn}" alt="Stored signature" class="w-full h-auto">
            </div>
          ` : `
            <div class="rounded border border-white/20 bg-white/10 p-3 text-sm text-glass">
              Signature: <span class="font-semibold">${escHtml(defaultTyped || defaultSignerName)}</span>
            </div>
          `}
        ` : `
          <div class="mb-3">
            <label class="block text-sm font-medium mb-2 text-glass">Legal Signer Name *</label>
            <input id="contractSignerNameInput" type="text" value="${escHtml(defaultSignerName)}" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20" placeholder="Full legal name">
          </div>

          <div class="flex gap-2 mb-3">
            <button id="signatureModeDrawBtn" class="glass-button px-3 py-2 text-sm ${defaultMode === "draw" ? "brand-bg" : ""}" type="button">
              <ion-icon name="brush-outline" class="mr-1"></ion-icon>Draw Signature
            </button>
            <button id="signatureModeTypeBtn" class="glass-button px-3 py-2 text-sm ${defaultMode === "type" ? "brand-bg" : ""}" type="button">
              <ion-icon name="text-outline" class="mr-1"></ion-icon>Type Signature
            </button>
          </div>

          <div id="typedSignatureWrap" class="${defaultMode === "type" ? "" : "hidden"} mb-3">
            <label class="block text-sm font-medium mb-2 text-glass">Typed Signature *</label>
            <input id="typedSignatureInput" type="text" value="${escHtml(defaultTyped)}" class="w-full border rounded px-3 py-2 bg-white/10 text-glass border-white/20" placeholder="Type your signature">
            <div id="typedSignaturePreview" class="mt-2 p-3 rounded border border-white/20 bg-white text-gray-800 text-2xl" style="font-family: 'Brush Script MT', 'Segoe Script', cursive;">
              ${escHtml(defaultTyped || defaultSignerName)}
            </div>
          </div>

          <div id="drawSignatureWrap" class="${defaultMode === "draw" ? "" : "hidden"} mb-3">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-glass">Draw Signature *</label>
              <button id="clearSignatureBtn" class="glass-button px-3 py-1 text-xs" type="button">Clear</button>
            </div>
            <canvas id="signatureCanvas" width="680" height="220" class="w-full h-40 rounded border border-white/20 bg-white touch-none"></canvas>
            <p class="text-xs text-glass-secondary mt-1">Use your finger or mouse to sign above.</p>
          </div>

          <div class="space-y-2 mb-4">
            <label class="flex items-start gap-2 text-sm text-glass cursor-pointer">
              <input id="agreeContractTermsCheckbox" type="checkbox" class="mt-1">
              <span>I have read and agree to the vendor contract terms.</span>
            </label>
            <label class="flex items-start gap-2 text-sm text-glass cursor-pointer">
              <input id="agreeElectronicSignatureCheckbox" type="checkbox" class="mt-1">
              <span>I agree this digital signature is legally binding for this vendor account.</span>
            </label>
          </div>

          <button id="submitContractSignatureBtn" class="brand-bg px-5 py-3 rounded w-full text-sm font-semibold">
            <ion-icon name="checkmark-circle-outline" class="mr-1"></ion-icon>Sign Contract
          </button>
        `}
      </div>
    </div>
  `;

  if (lockForVendor) return;

  let signatureMode = defaultMode;
  let typedSignature = defaultTyped;
  let drawnSignatureDataUrl = defaultDrawn;
  let hasDrawnStroke = false;

  const modeDrawBtn = root.querySelector("#signatureModeDrawBtn");
  const modeTypeBtn = root.querySelector("#signatureModeTypeBtn");
  const drawWrap = root.querySelector("#drawSignatureWrap");
  const typeWrap = root.querySelector("#typedSignatureWrap");
  const typedInput = root.querySelector("#typedSignatureInput");
  const typedPreview = root.querySelector("#typedSignaturePreview");
  const signerNameInput = root.querySelector("#contractSignerNameInput");
  const clearBtn = root.querySelector("#clearSignatureBtn");
  const submitBtn = root.querySelector("#submitContractSignatureBtn");
  const termsCheckbox = root.querySelector("#agreeContractTermsCheckbox");
  const electronicCheckbox = root.querySelector("#agreeElectronicSignatureCheckbox");
  const canvas = root.querySelector("#signatureCanvas");

  const setMode = (nextMode) => {
    signatureMode = nextMode === "type" ? "type" : "draw";
    drawWrap?.classList.toggle("hidden", signatureMode !== "draw");
    typeWrap?.classList.toggle("hidden", signatureMode !== "type");
    modeDrawBtn?.classList.toggle("brand-bg", signatureMode === "draw");
    modeTypeBtn?.classList.toggle("brand-bg", signatureMode === "type");
  };

  if (typedInput && typedPreview) {
    typedInput.oninput = () => {
      typedSignature = String(typedInput.value || "").trim();
      typedPreview.textContent = typedSignature || String(signerNameInput?.value || "").trim();
    };
  }

  signerNameInput.oninput = () => {
    if (!typedSignature && typedPreview) {
      typedPreview.textContent = String(signerNameInput.value || "").trim();
    }
  };

  modeDrawBtn.onclick = () => setMode("draw");
  modeTypeBtn.onclick = () => setMode("type");
  setMode(signatureMode);

  let drawing = false;
  let lastPoint = null;
  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2.2;

      const beginStroke = (evt) => {
        drawing = true;
        const p = normalizeCanvasPoint(canvas, evt);
        lastPoint = p;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      };

      const continueStroke = (evt) => {
        if (!drawing) return;
        const p = normalizeCanvasPoint(canvas, evt);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastPoint = p;
        hasDrawnStroke = true;
      };

      const endStroke = () => {
        if (!drawing) return;
        drawing = false;
        lastPoint = null;
        drawnSignatureDataUrl = canvas.toDataURL("image/png");
      };

      canvas.addEventListener("mousedown", beginStroke);
      canvas.addEventListener("mousemove", continueStroke);
      window.addEventListener("mouseup", endStroke);

      canvas.addEventListener("touchstart", (evt) => {
        evt.preventDefault();
        beginStroke(evt);
      }, { passive: false });
      canvas.addEventListener("touchmove", (evt) => {
        evt.preventDefault();
        continueStroke(evt);
      }, { passive: false });
      canvas.addEventListener("touchend", (evt) => {
        evt.preventDefault();
        endStroke();
      }, { passive: false });

      if (defaultDrawn) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawnSignatureDataUrl = canvas.toDataURL("image/png");
          hasDrawnStroke = true;
        };
        img.src = defaultDrawn;
      }
    }
  }

  clearBtn.onclick = () => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnStroke = false;
    drawnSignatureDataUrl = "";
  };

  submitBtn.onclick = async () => {
    const signerName = String(signerNameInput?.value || "").trim();
    typedSignature = String(typedInput?.value || typedSignature || "").trim();

    if (!signerName) {
      Toast("Legal signer name is required");
      return;
    }
    if (!termsCheckbox?.checked) {
      Toast("Please accept the contract terms");
      return;
    }
    if (!electronicCheckbox?.checked) {
      Toast("Please accept the electronic signature acknowledgement");
      return;
    }

    if (signatureMode === "type" && !typedSignature) {
      Toast("Type your signature to continue");
      return;
    }
    if (signatureMode === "draw") {
      if (!hasDrawnStroke && !drawnSignatureDataUrl) {
        Toast("Draw your signature to continue");
        return;
      }
      if (!drawnSignatureDataUrl && canvas) {
        drawnSignatureDataUrl = canvas.toDataURL("image/png");
      }
    }

    submitBtn.setAttribute("disabled", "disabled");
    submitBtn.classList.add("opacity-60");
    submitBtn.innerHTML = `<ion-icon name="hourglass-outline" class="mr-1"></ion-icon>Saving Signature...`;

    try {
      const { getAuth } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js");
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        throw new Error("Not signed in");
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch("/.netlify/functions/sign-vendor-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          vendorId: vendor.id,
          signerName,
          signatureMode,
          typedSignature: signatureMode === "type" ? typedSignature : "",
          drawnSignatureDataUrl: signatureMode === "draw" ? drawnSignatureDataUrl : "",
          contractVersion: vendor.contractVersion || VENDOR_CONTRACT_VERSION,
          contractUrl
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to sign contract");
      }

      if (Array.isArray(payload.emailErrors) && payload.emailErrors.length) {
        Toast("Signature saved. Some confirmation emails need retry by admin.");
      } else {
        Toast("Contract signed and confirmations sent");
      }
      setTimeout(() => navigate("/vendor-dashboard"), 700);
    } catch (error) {
      console.error("[VendorContract] sign failed:", error);
      Toast(error?.message || "Could not sign contract");
      submitBtn.removeAttribute("disabled");
      submitBtn.classList.remove("opacity-60");
      submitBtn.innerHTML = `<ion-icon name="checkmark-circle-outline" class="mr-1"></ion-icon>Sign Contract`;
    }
  };
}
