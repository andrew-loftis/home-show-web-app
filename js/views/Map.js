export default function Map(root) {
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Event Map</h2>
      <div class="mb-4">
        <button class="brand-bg px-4 py-2 rounded" onclick="window.location.hash='/interactive-map'">Open Interactive Map</button>
      </div>
      <img src="./assets/floorplan.svg" alt="Map" class="w-full rounded shadow" onerror="this.style.display='none'">
    </div>
  `;
}
