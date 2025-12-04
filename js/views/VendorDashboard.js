import { Modal, Toast } from "../utils/ui.js";
import { navigate } from "../router.js";
import { getState } from "../store.js";
import { renderErrorUI, renderNetworkError, renderAccessDenied } from "../utils/errorBoundary.js";

export default async function VendorDashboard(root) {
  const state = getState();
  
  if (!state.user) {
    renderAccessDenied(root, "vendor");
    return;
  }

  // Load vendor data from Firestore
  let vendorData = null;
  let loadError = null;
  
  try {
    const { getDb } = await import("../firebase.js");
    const db = getDb();
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js");
    
    const vendorsRef = collection(db, 'vendors');
    // Query by ownerUid to match Firebase security rules
    const q = query(vendorsRef, where('ownerUid', '==', state.user.uid));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      vendorData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
  } catch (error) {
    console.error('Error loading vendor data:', error);
    loadError = error;
    
    // Check if it's a network error
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      renderNetworkError(root, () => VendorDashboard(root));
      return;
    }
  }
  
  // Handle load error
  if (loadError && !vendorData) {
    renderErrorUI(root, {
      title: "Could Not Load Dashboard",
      message: "We had trouble loading your vendor information. Please try again.",
      error: loadError,
      retryAction: () => VendorDashboard(root)
    });
    return;
  }

  if (!vendorData) {
    root.innerHTML = `
      <div class="container-glass fade-in">
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
            <ion-icon name="storefront-outline" class="text-4xl text-blue-400"></ion-icon>
          </div>
          <h2 class="text-xl font-bold mb-2 text-glass">Vendor Account Not Found</h2>
          <p class="text-sm text-glass-secondary max-w-sm mb-6">We couldn't find a vendor account linked to your email. Register to get started.</p>
          <button class="brand-bg px-6 py-3 rounded-xl font-semibold text-sm touch-target" onclick="window.location.hash='/vendor-registration'">
            <ion-icon name="add-outline" class="mr-2"></ion-icon>
            Register as Vendor
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (!vendorData.approved) {
    root.innerHTML = `
      <div class='p-8 text-center'>
        <div class="glass-card p-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ion-icon name="hourglass-outline" class="text-3xl text-yellow-400"></ion-icon>
            </div>
            <h2 class="text-2xl font-bold mb-4 text-glass">Application Under Review</h2>
            <p class="text-glass-secondary mb-6">Your vendor application is currently being reviewed by our team. We'll notify you once it's been approved.</p>
            <div class="bg-glass-surface rounded-lg p-4 mb-6">
              <h3 class="font-semibold text-glass mb-2">Application Details:</h3>
              <div class="text-left text-sm text-glass-secondary space-y-1">
                <p><span class="font-medium">Business Name:</span> ${vendorData.name}</p>
                <p><span class="font-medium">Contact Email:</span> ${vendorData.contactEmail}</p>
                <p><span class="font-medium">Category:</span> ${vendorData.category || 'Not specified'}</p>
                <p><span class="font-medium">Submitted:</span> ${vendorData.createdAt ? new Date(vendorData.createdAt.toDate()).toLocaleDateString() : 'Recently'}</p>
              </div>
            </div>
            <button class="glass-button px-6 py-2 rounded" onclick="window.location.hash='/edit-vendor'">
              <ion-icon name="create-outline" class="mr-2"></ion-icon>Edit Application
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Render the approved vendor dashboard
  render(vendorData);

  async function render(vendor) {
    const paymentStatusInfo = getPaymentStatusInfo(vendor);
    
    root.innerHTML = `
      <div class="container-glass fade-in">
        <!-- Header -->
        <div class="bg-gradient-to-r from-brand to-purple-600 text-white p-4 md:p-6 rounded-t-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-xl md:text-2xl font-bold">${vendor.name}</h1>
              <p class="opacity-90 text-sm">${vendor.contactEmail}</p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                  <ion-icon name="checkmark-circle" class="mr-1"></ion-icon>Approved
                </span>
                <span class="${paymentStatusInfo.statusClass} px-2 py-1 rounded-full text-xs">
                  ${paymentStatusInfo.icon} ${paymentStatusInfo.text}
                </span>
              </div>
            </div>
            <div class="text-left sm:text-right">
              <div class="text-xs opacity-75">Total Revenue</div>
              <div class="text-xl md:text-2xl font-bold">$${(vendor.totalPrice || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div class="p-4 md:p-6 bg-glass-surface rounded-b-xl">
          <!-- Quick Actions - Stack on mobile -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <button class="glass-card p-4 hover:bg-glass-surface transition-colors text-left touch-target" onclick="editProfile()">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-glass text-sm md:text-base">Edit Profile</h3>
                  <p class="text-xs md:text-sm text-glass-secondary">Update business info</p>
                </div>
                <ion-icon name="create-outline" class="text-xl md:text-2xl text-brand"></ion-icon>
              </div>
            </button>
            
            <button class="glass-card p-4 hover:bg-glass-surface transition-colors text-left touch-target" onclick="viewMyCard()">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-glass text-sm md:text-base">My Business Card</h3>
                  <p class="text-xs md:text-sm text-glass-secondary">For card swapping</p>
                </div>
                <div class="text-right">
                  <ion-icon name="card-outline" class="text-xl md:text-2xl text-brand"></ion-icon>
                </div>
              </div>
            </button>
            
            <button class="glass-card p-4 hover:bg-glass-surface transition-colors text-left touch-target sm:col-span-2 lg:col-span-1" onclick="viewLeads()">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-glass text-sm md:text-base">My Leads</h3>
                  <p class="text-xs md:text-sm text-glass-secondary">Manage connections</p>
                </div>
                <ion-icon name="people-outline" class="text-xl md:text-2xl text-brand"></ion-icon>
              </div>
            </button>
          </div>

          <!-- Business Details -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <!-- Business Information -->
            <div class="glass-card p-4 md:p-6">
              <h3 class="text-base md:text-lg font-semibold text-glass mb-4 flex items-center">
                <ion-icon name="business-outline" class="mr-2"></ion-icon>
                Business Information
              </h3>
              <div class="space-y-3 text-sm">
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Business Name:</span>
                  <span class="text-glass font-medium">${vendor.name}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Category:</span>
                  <span class="text-glass font-medium">${vendor.category || 'Not specified'}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Contact Email:</span>
                  <span class="text-glass font-medium">${vendor.contactEmail}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Phone:</span>
                  <span class="text-glass font-medium">${vendor.phone || 'Not provided'}</span>
                </div>
                ${vendor.website ? `
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Website:</span>
                  <a href="${vendor.website}" target="_blank" class="text-blue-400 hover:text-blue-300 font-medium">
                    ${vendor.website}
                  </a>
                </div>
                ` : ''}
              </div>
            </div>

            <!-- Booth Information -->
            <div class="glass-card p-6">
              <h3 class="text-lg font-semibold text-glass mb-4 flex items-center">
                <ion-icon name="storefront-outline" class="mr-2"></ion-icon>
                Booth Details
              </h3>
              <div class="space-y-3 text-sm">
                ${vendor.booths && vendor.booths.length > 0 ? `
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Assigned Booths:</span>
                  <span class="text-glass font-medium">${vendor.booths.join(', ')}</span>
                </div>
                ` : `
                <div class="text-center py-4 text-glass-secondary">
                  <ion-icon name="cube-outline" class="text-2xl mb-2"></ion-icon>
                  <p>No booths assigned yet</p>
                </div>
                `}
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Total Cost:</span>
                  <span class="text-glass font-medium text-lg text-green-400">$${(vendor.totalPrice || 0).toLocaleString()}</span>
                </div>
                ${vendor.booths && vendor.booths.length > 0 ? `
                <div class="flex justify-between">
                  <span class="text-glass-secondary">Booth Count:</span>
                  <span class="text-glass font-medium">${vendor.booths.length} booth${vendor.booths.length > 1 ? 's' : ''}</span>
                </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Payment Status Section -->
          <div class="glass-card p-6 mt-6">
            <h3 class="text-lg font-semibold text-glass mb-4 flex items-center">
              <ion-icon name="card-outline" class="mr-2"></ion-icon>
              Payment Status
            </h3>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="${paymentStatusInfo.statusClass} w-4 h-4 rounded-full mr-3"></div>
                <div>
                  <p class="text-glass font-medium">${paymentStatusInfo.text}</p>
                  <p class="text-sm text-glass-secondary">${paymentStatusInfo.description}</p>
                </div>
              </div>
              ${paymentStatusInfo.actionButton || ''}
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="glass-card p-6 mt-6">
            <h3 class="text-lg font-semibold text-glass mb-4 flex items-center">
              <ion-icon name="time-outline" class="mr-2"></ion-icon>
              Recent Activity
            </h3>
            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between py-2 border-b border-glass-border">
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  <span class="text-glass">Vendor application approved</span>
                </div>
                <span class="text-glass-secondary">${vendor.updatedAt ? new Date(vendor.updatedAt.toDate()).toLocaleDateString() : 'Recently'}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-glass-border">
                <div class="flex items-center">
                  <div class="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  <span class="text-glass">Application submitted</span>
                </div>
                <span class="text-glass-secondary">${vendor.createdAt ? new Date(vendor.createdAt.toDate()).toLocaleDateString() : 'Recently'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    setupEventHandlers();
  }

  function getPaymentStatusInfo(vendor) {
    if (vendor.paymentStatus === 'paid') {
      return {
        icon: '💰',
        text: 'Payment Complete',
        description: 'Your booth payment has been received',
        statusClass: 'bg-green-500',
        actionButton: ''
      };
    } else if (vendor.paymentStatus === 'payment_sent') {
      return {
        icon: '📧',
        text: 'Invoice Sent',
        description: 'Please check your email for payment instructions',
        statusClass: 'bg-yellow-500',
        actionButton: '<button class="glass-button px-4 py-2 text-sm" onclick="checkEmail()">Check Email</button>'
      };
    } else if (vendor.approved) {
      return {
        icon: '⏳',
        text: 'Payment Pending',
        description: 'Awaiting payment processing from admin',
        statusClass: 'bg-red-500',
        actionButton: '<button class="glass-button px-4 py-2 text-sm" onclick="contactAdmin()">Contact Admin</button>'
      };
    } else {
      return {
        icon: '⏳',
        text: 'Awaiting Approval',
        description: 'Your application is under review',
        statusClass: 'bg-gray-500',
        actionButton: ''
      };
    }
  }

  function setupEventHandlers() {
    // Global functions for onclick handlers
    window.editProfile = () => {
      navigate('/edit-vendor');
    };

    window.viewMyCard = () => {
      navigate('/my-card');
    };

    window.viewLeads = () => {
      navigate('/vendor-leads');
    };

    window.checkEmail = () => {
      Toast.show('Please check your email for the payment invoice', 'info');
    };

    window.contactAdmin = () => {
      const adminEmail = 'andrew@houseofkna.com';
      const subject = 'Vendor Payment Inquiry';
      const body = `Hi,\n\nI'm reaching out regarding my vendor booth payment. My business is ${vendorData.name} and my email is ${vendorData.contactEmail}.\n\nCould you please send me the payment information?\n\nThank you!`;
      
      window.open(`mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };
  }
}