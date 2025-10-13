import { setOnboarded } from "../store.js";
import { navigate } from "../router.js";

export default function Onboarding(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[70vh] p-6 fade-in">
  <img src="./assets/splash.svg" alt="HomeShow" class="w-24 h-24 mb-6" onerror="this.style.display='none'">
  <h1 class="text-2xl font-bold mb-2 brand">Welcome to HomeShow</h1>
      <p class="text-gray-600 mb-6 text-center">Swap cards. Discover vendors. Connect fast.<br>Get started by selecting your role.</p>
      <button class="brand-bg px-6 py-2 rounded text-lg font-semibold mt-2" id="continueBtn">Continue</button>
    </div>
  `;
  root.querySelector("#continueBtn").onclick = () => {
    setOnboarded();
    navigate("/role");
  };
}
