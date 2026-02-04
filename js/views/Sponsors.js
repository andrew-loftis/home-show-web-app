export default function Sponsors(root) {
  const sponsors = [
    { name: "Home Depot", tier: "Platinum Sponsor", logo: "https://placehold.co/80x80/FF6600/white?text=HD", color: "from-orange-500/20 to-orange-600/20" },
    { name: "Lowe's", tier: "Platinum Sponsor", logo: "https://placehold.co/80x80/004990/white?text=L", color: "from-blue-500/20 to-blue-600/20" },
    { name: "Sunrun", tier: "Gold Sponsor", logo: "https://placehold.co/80x80/F99F1C/white?text=SR", color: "from-yellow-500/20 to-yellow-600/20" },
    { name: "Stanley Tools", tier: "Gold Sponsor", logo: "https://placehold.co/80x80/FFD100/black?text=ST", color: "from-yellow-400/20 to-amber-500/20" },
    { name: "Kohler", tier: "Silver Sponsor", logo: "https://placehold.co/80x80/1A1A1A/white?text=K", color: "from-gray-500/20 to-gray-600/20" },
    { name: "Sherwin-Williams", tier: "Silver Sponsor", logo: "https://placehold.co/80x80/0073CF/white?text=SW", color: "from-blue-400/20 to-blue-500/20" }
  ];
  
  const tierColors = {
    "Platinum Sponsor": "text-purple-400",
    "Gold Sponsor": "text-yellow-400",
    "Silver Sponsor": "text-gray-400"
  };
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Our Sponsors</h1>
        <p class="text-glass-secondary text-sm">Thank you to our amazing partners</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${sponsors.map(sponsor => `
          <div class="glass-card p-4 flex items-center gap-4">
            <div class="w-16 h-16 rounded-xl bg-gradient-to-br ${sponsor.color} flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/10">
              <img src="${sponsor.logo}" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<ion-icon name=\\'business-outline\\' class=\\'text-2xl text-glass-secondary\\'></ion-icon>'">
            </div>
            <div class="flex-1">
              <div class="font-semibold text-glass text-lg">${sponsor.name}</div>
              <div class="text-xs ${tierColors[sponsor.tier] || 'text-glass-secondary'} font-medium flex items-center gap-1">
                <ion-icon name="ribbon-outline" class="text-sm"></ion-icon>
                ${sponsor.tier}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
      
      <div class="mt-8 text-center">
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-glass mb-2">Interested in Sponsoring?</h3>
          <p class="text-glass-secondary text-sm mb-4">Join our family of sponsors and reach thousands of homeowners.</p>
          <button class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm" onclick="window.location.href='mailto:sponsors@winnpro-shows.app'">
            <ion-icon name="mail-outline" class="mr-2"></ion-icon>
            Contact Us
          </button>
        </div>
      </div>
    </div>
  `;
}
