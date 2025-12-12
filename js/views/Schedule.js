export default function Schedule(root) {
  const events = [
    { time: "9:00 AM", title: "Doors Open", location: "Main Entrance", icon: "enter-outline" },
    { time: "10:00 AM", title: "Keynote: The Future of Home", location: "Main Stage", icon: "mic-outline" },
    { time: "11:00 AM", title: "Kitchen & Bath Trends Panel", location: "Seminar Room A", icon: "water-outline" },
    { time: "12:00 PM", title: "Lunch Break", location: "Cafeteria", icon: "restaurant-outline" },
    { time: "1:00 PM", title: "Smart Home Showcase", location: "Tech Zone", icon: "home-outline" },
    { time: "2:00 PM", title: "Vendor Demos", location: "Exhibit Hall", icon: "construct-outline" },
    { time: "3:30 PM", title: "DIY Workshop: Home Maintenance Tips", location: "Workshop Area", icon: "hammer-outline" },
    { time: "5:00 PM", title: "Closing Remarks & Prize Drawings", location: "Main Stage", icon: "gift-outline" }
  ];
  
  root.innerHTML = `
    <div class="container-glass fade-in">
      <div class="text-center mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-glass">Event Schedule</h1>
        <p class="text-glass-secondary text-sm">Today's events and activities</p>
      </div>
      
      <div class="space-y-3">
        ${events.map((event, idx) => `
          <div class="glass-card p-4 flex items-start gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
              <ion-icon name="${event.icon}" class="text-xl text-blue-400"></ion-icon>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-semibold text-blue-400">${event.time}</span>
              </div>
              <div class="font-semibold text-glass mb-1">${event.title}</div>
              <div class="text-xs text-glass-secondary flex items-center gap-1">
                <ion-icon name="location-outline" class="text-xs"></ion-icon>
                ${event.location}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}
