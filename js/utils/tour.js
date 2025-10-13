import { Modal, closeModal } from './ui.js';
import { getState, markWalkthrough, hasSeenWalkthrough } from '../store.js';

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

function buildStep({ title, body, icon = 'information-circle-outline' }) {
  return `
    <div class="p-2">
      <div class="w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
        <ion-icon name="${icon}" class="text-white text-2xl"></ion-icon>
      </div>
      <h3 class="text-xl font-semibold text-glass text-center mb-2">${title}</h3>
      <div class="text-sm text-glass-secondary leading-relaxed">${body}</div>
    </div>
  `;
}

const steps = {
  general: [
    { title: 'Welcome to HomeShow', icon: 'home-outline', body: 'Find vendors, share your card, and collect contacts during the event. Use the bottom tabs to navigate.' },
    { title: 'Create Your Card', icon: 'card-outline', body: 'Build your digital card in My Card. Share it with vendors via QR or save vendors you like.' },
    { title: 'Dark/Light Mode', icon: 'moon-outline', body: 'Switch themes from the Profile page. We remember your choice on this device and your account.' }
  ],
  attendee: [
    { title: 'Build Your Card', icon: 'person-outline', body: 'Fill your name and contact info, add a photo/background, and tell vendors what you’re looking for.' },
    { title: 'Share & Save', icon: 'qr-code-outline', body: 'Share your card with vendors (QR or tap). Saved vendors appear in Saved Vendors for easy follow-up.' },
    { title: 'Your Activity', icon: 'time-outline', body: 'See your shares and saved vendors in Cards and Saved Vendors anytime.' }
  ],
  vendor: [
    { title: 'Complete Your Profile', icon: 'storefront-outline', body: 'Add logo, description, offers, links, and booth so attendees can learn about your business.' },
    { title: 'Landing Page', icon: 'globe-outline', body: 'Your profile becomes a landing page automatically. Share it from the Vendor page.' },
    { title: 'Leads & Cards', icon: 'people-outline', body: 'View card swaps and leads in Cards and on your vendor dashboard. Follow up after the show.' }
  ],
  admin: [
    { title: 'Admin Dashboard', icon: 'speedometer-outline', body: 'See total exchanges, top vendors by leads, and global stats in the Admin Dashboard.' },
    { title: 'Card Traffic', icon: 'swap-horizontal-outline', body: 'Monitor attendee↔vendor swaps across the event. Drill into leads when needed.' },
    { title: 'Vendor Management', icon: 'shield-checkmark-outline', body: 'Approve/deny vendors, review details, and keep content up to date. Access from Profile → Admin Dashboard.' }
  ]
};

export function startWalkthrough(kind = 'general') {
  const s = steps[kind] || steps.general;
  let idx = 0;
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-glass rounded-2xl p-4 max-w-lg w-full text-glass';

  const render = () => {
    const step = s[idx];
    wrapper.innerHTML = `
      <div class='mb-4'>${buildStep(step)}</div>
      <div class='flex items-center justify-between mt-6'>
        <button id='skip' class='glass-button px-4 py-2'>Skip</button>
        <div class='flex gap-2'>
          <button id='prev' class='glass-button px-4 py-2' ${idx === 0 ? 'disabled' : ''}>Back</button>
          <button id='next' class='brand-bg px-4 py-2'>${idx === s.length - 1 ? 'Done' : 'Next'}</button>
        </div>
      </div>
      <div class='mt-4 text-center text-xs text-glass-secondary'>You can revisit this anytime in Profile → App Walkthrough</div>
    `;
    const prev = wrapper.querySelector('#prev');
    const next = wrapper.querySelector('#next');
    const skip = wrapper.querySelector('#skip');
    if (prev) prev.onclick = () => { if (idx > 0) { idx--; render(); } };
    if (next) next.onclick = async () => {
      if (idx < s.length - 1) { idx++; render(); }
      else { await markWalkthrough(kind, true); closeModal(); }
    };
    if (skip) skip.onclick = async () => { await markWalkthrough(kind, true); closeModal(); };
  };
  render();
  Modal(wrapper);
}

export async function ensureFirstTimeWalkthrough() {
  const state = getState();
  // Show general first-run walkthrough if never seen
  if (!hasSeenWalkthrough('general')) {
    startWalkthrough('general');
    return;
  }
  // Role-based walkthroughs (first time in role)
  const role = state.isAdmin ? 'admin' : (state.role === 'vendor' ? 'vendor' : (state.role === 'attendee' ? 'attendee' : null));
  if (role && !hasSeenWalkthrough(role)) {
    startWalkthrough(role);
  }
}
