import { getState } from "../store.js";

export default function InteractiveMap(root) {
  const { vendors } = getState();
  const boothMap = [
    { id: "A1", x: 40, y: 60 },
    { id: "B2", x: 120, y: 60 },
    { id: "C3", x: 200, y: 60 },
    { id: "D4", x: 40, y: 140 },
    { id: "E5", x: 120, y: 140 }
  ];
  const occupied = vendors.reduce((acc, v) => { acc[v.booth] = v; return acc; }, {});
  root.innerHTML = `
    <div class="p-4 fade-in">
      <h2 class="text-xl font-bold mb-2 text-glass">Interactive Map</h2>
      <div class="relative w-full max-w-md mx-auto h-72 glass-card rounded shadow mb-4 overflow-hidden">
        <svg viewBox="0 0 300 220" class="absolute inset-0 w-full h-full">
          <rect x="10" y="10" width="280" height="200" rx="16" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2" />
          <circle cx="20" cy="210" r="10" fill="#1E63B5" />
          <text x="35" y="215" font-size="12" fill="#1E63B5">Entrance</text>
          ${boothMap.map(b => {
            const v = occupied[b.id];
            return `<rect x="${b.x}" y="${b.y}" width="60" height="40" rx="6" fill="${v ? '#1E63B5' : '#e5e7eb'}" stroke="#0D3D85" stroke-width="1.5" data-booth="${b.id}" class="booth-rect cursor-pointer" />
            <text x="${b.x+30}" y="${b.y+22}" text-anchor="middle" font-size="13" fill="#fff">${b.id}</text>`;
          }).join("")}
        </svg>
        <div id="boothCard" class="absolute left-0 right-0 mx-auto top-2 z-10" style="max-width:220px;display:none;"></div>
      </div>
      <div class="text-xs text-gray-500 flex gap-4 items-center"><span class="inline-block w-4 h-4 rounded bg-primary"></span> Occupied <span class="inline-block w-4 h-4 rounded bg-gray-300"></span> Empty</div>
    </div>
  `;
  const svg = root.querySelector("svg");
  svg.addEventListener("click", e => {
    if (e.target.classList.contains("booth-rect")) {
      const boothId = e.target.getAttribute("data-booth");
      const v = occupied[boothId];
      const card = root.querySelector("#boothCard");
      if (v) {
        card.innerHTML = `<div class='card p-3 text-center'>
          <div class='font-bold mb-1'>${v.name}</div>
          <div class='text-xs text-gray-500 mb-2'>${v.category}</div>
          <button class='brand-bg px-3 py-1 rounded' onclick='window.location.hash="/vendor/${v.id}"'>View Profile</button>
        </div>`;
        card.style.display = "block";
      } else {
        card.innerHTML = `<div class='card p-3 text-center text-gray-400'>Empty Booth</div>`;
        card.style.display = "block";
      }
    } else {
      root.querySelector("#boothCard").style.display = "none";
    }
  });
}
