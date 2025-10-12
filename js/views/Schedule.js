export default function Schedule(root) {
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Event Schedule</h2>
      <div class="card p-4 mb-2">
        <div class="font-semibold">9:00 AM - Doors Open</div>
        <div class="text-xs text-gray-500">Main Entrance</div>
      </div>
      <div class="card p-4 mb-2">
        <div class="font-semibold">10:00 AM - Keynote: The Future of Home</div>
        <div class="text-xs text-gray-500">Main Stage</div>
      </div>
      <div class="card p-4 mb-2">
        <div class="font-semibold">12:00 PM - Lunch Break</div>
        <div class="text-xs text-gray-500">Cafeteria</div>
      </div>
      <div class="card p-4 mb-2">
        <div class="font-semibold">2:00 PM - Vendor Demos</div>
        <div class="text-xs text-gray-500">Exhibit Hall</div>
      </div>
      <div class="card p-4 mb-2">
        <div class="font-semibold">5:00 PM - Closing Remarks</div>
        <div class="text-xs text-gray-500">Main Stage</div>
      </div>
    </div>
  `;
}
