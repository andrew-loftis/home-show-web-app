import { setRole, vendorLogout, getState } from "../store.js";
import { navigate } from "../router.js";

const roles = [
  {
    key: "attendee",
    icon: "person-outline",
    title: "Attendee",
    desc: "Explore, connect, and save your favorite vendors."
  },
  {
    key: "vendor",
    icon: "briefcase-outline",
    title: "Vendor",
    desc: "Scan leads, manage your booth, and view stats."
  },
  {
    key: "admin",
    icon: "ribbon-outline",
    title: "Admin",
    desc: "Manage the event, vendors, and schedule."
  }
];

export default function RoleSelect(root) {
  const state = getState();
  root.innerHTML = `
    <div class="p-6 fade-in">
      <h2 class="text-xl font-bold mb-4">Select Your Role</h2>
      <div class="grid gap-4">
        ${roles.map(r => `
          <div class="card flex items-center gap-4 p-4 cursor-pointer role-card" data-role="${r.key}">
            <ion-icon name="${r.icon}" class="text-3xl brand"></ion-icon>
            <div>
              <div class="font-semibold text-lg">${r.title}</div>
              <div class="text-gray-500 text-sm">${r.desc}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  root.querySelectorAll(".role-card").forEach(card => {
    card.onclick = () => {
      const role = card.dataset.role;
      if (role !== "vendor") vendorLogout();
      // Admins can pick any view; vendors require ownership unless admin
      if (role === 'vendor' && !state.isAdmin) {
        if (!state.myVendor) {
          // If not a vendor owner, redirect to registration
          navigate("/vendor-registration");
          return;
        }
      }
      setRole(role === 'attendee' ? 'attendee' : (role === 'vendor' ? 'vendor' : 'admin'));
      if (role === "vendor") navigate(state.myVendor ? "/home" : "/vendor-login");
      else navigate("/home");
    };
  });
}
