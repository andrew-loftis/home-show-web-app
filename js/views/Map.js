export default function Map(root) {
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Event Map</h1>
        <p class="text-glass-secondary text-sm">Find your way around the show</p>
      </div>
      
      <div class="glass-card p-4 mb-6">
        <button class="brand-bg w-full px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2" onclick="window.location.hash='/interactive-map'">
          <ion-icon name="map-outline" class="text-xl"></ion-icon>
          Open Interactive Map
        </button>
        <p class="text-center text-xs text-glass-secondary mt-3">Tap booths to see vendor details</p>
      </div>
      
      <div class="glass-card overflow-hidden">
        <div class="p-4 border-b border-white/10">
          <h3 class="font-semibold text-glass flex items-center gap-2">
            <ion-icon name="image-outline" class="text-blue-400"></ion-icon>
            Floor Plan Overview
          </h3>
        </div>
        <div class="p-4 bg-white/5">
          <img src="./assets/floorplan.svg" alt="Floor Plan" class="w-full rounded-lg" onerror="this.parentElement.innerHTML='<div class=\\'text-center py-8 text-glass-secondary\\'><ion-icon name=\\'map-outline\\' class=\\'text-4xl mb-2\\'></ion-icon><p>Floor plan coming soon</p></div>'">
        </div>
      </div>
      
      <div class="mt-6 grid grid-cols-2 gap-3">
        <div class="glass-card p-4 text-center">
          <ion-icon name="enter-outline" class="text-2xl text-green-400 mb-2"></ion-icon>
          <div class="text-sm font-medium text-glass">Main Entrance</div>
          <div class="text-xs text-glass-secondary">North Side</div>
        </div>
        <div class="glass-card p-4 text-center">
          <ion-icon name="restaurant-outline" class="text-2xl text-orange-400 mb-2"></ion-icon>
          <div class="text-sm font-medium text-glass">Food Court</div>
          <div class="text-xs text-glass-secondary">West Wing</div>
        </div>
        <div class="glass-card p-4 text-center">
          <ion-icon name="medkit-outline" class="text-2xl text-red-400 mb-2"></ion-icon>
          <div class="text-sm font-medium text-glass">First Aid</div>
          <div class="text-xs text-glass-secondary">Info Booth</div>
        </div>
        <div class="glass-card p-4 text-center">
          <ion-icon name="accessibility-outline" class="text-2xl text-blue-400 mb-2"></ion-icon>
          <div class="text-sm font-medium text-glass">Restrooms</div>
          <div class="text-xs text-glass-secondary">All Areas</div>
        </div>
      </div>
    </div>
  `;
}
