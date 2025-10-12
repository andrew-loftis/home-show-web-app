export default function Sponsors(root) {
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Sponsors</h2>
      <div class="card p-4 mb-2 flex items-center gap-4">
        <img src="https://placehold.co/64x64?text=SP1" class="w-10 h-10 rounded" onerror="this.style.display='none'">
        <div>
          <div class="font-semibold">Home Depot</div>
          <div class="text-xs text-gray-500">Platinum Sponsor</div>
        </div>
      </div>
      <div class="card p-4 mb-2 flex items-center gap-4">
        <img src="https://placehold.co/64x64?text=SP2" class="w-10 h-10 rounded" onerror="this.style.display='none'">
        <div>
          <div class="font-semibold">Lowe's</div>
          <div class="text-xs text-gray-500">Gold Sponsor</div>
        </div>
      </div>
      <div class="card p-4 mb-2 flex items-center gap-4">
        <img src="https://placehold.co/64x64?text=SP3" class="w-10 h-10 rounded" onerror="this.style.display='none'">
        <div>
          <div class="font-semibold">Sunrun</div>
          <div class="text-xs text-gray-500">Silver Sponsor</div>
        </div>
      </div>
    </div>
  `;
}
