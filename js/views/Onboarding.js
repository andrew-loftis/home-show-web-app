import { setOnboarded } from "../store.js";
import { navigate } from "../router.js";

export default function Onboarding(root) {
  root.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-[80vh] p-6 fade-in">
      <div class="glass-card p-8 text-center max-w-md mx-auto">
        <div class="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <img src="./assets/splash.svg" alt="Winn-Pro" class="w-16 h-16" onerror="this.parentElement.innerHTML='<ion-icon name=\\'home-outline\\' class=\\'text-5xl text-blue-400\\'></ion-icon>'">
        </div>
        <h1 class="text-2xl md:text-3xl font-bold mb-3 text-glass">Welcome to Winn-Pro</h1>
        <p class="text-glass-secondary mb-8 leading-relaxed">
          Swap cards. Discover vendors. Connect fast.<br>
          <span class="text-sm">Your digital business card for trade shows.</span>
        </p>
        
        <button class="brand-bg w-full px-6 py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2" id="continueBtn">
          Get Started
          <ion-icon name="arrow-forward-outline"></ion-icon>
        </button>
        
        <p class="text-xs text-glass-secondary mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  `;
  root.querySelector("#continueBtn").onclick = () => {
    setOnboarded();
    navigate("/home");
  };
}
