/**
 * Real-time Features
 * Firebase Firestore real-time subscriptions for live updates
 */

// Track active subscriptions for cleanup
const activeSubscriptions = new Map();

/**
 * Subscribe to real-time attendee count
 * @param {function} callback - Called with updated count
 * @returns {function} Unsubscribe function
 */
export async function subscribeToAttendeeCount(callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, onSnapshot, getCountFromServer } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    // Get initial count
    const countSnap = await getCountFromServer(collection(db, 'attendees'));
    callback(countSnap.data().count);

    // Subscribe to changes
    const unsubscribe = onSnapshot(collection(db, 'attendees'), (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.warn('Attendee count subscription error:', error);
    });

    activeSubscriptions.set('attendeeCount', unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to attendee count:', error);
    return () => {};
  }
}

/**
 * Subscribe to real-time vendor count
 * @param {function} callback - Called with { total, approved, pending }
 * @returns {function} Unsubscribe function
 */
export async function subscribeToVendorCount(callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, onSnapshot } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    const unsubscribe = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      let approved = 0;
      let pending = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.approved) {
          approved++;
        } else {
          pending++;
        }
      });
      
      callback({
        total: snapshot.size,
        approved,
        pending
      });
    }, (error) => {
      console.warn('Vendor count subscription error:', error);
    });

    activeSubscriptions.set('vendorCount', unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to vendor count:', error);
    return () => {};
  }
}

/**
 * Subscribe to real-time lead count for a vendor
 * @param {string} vendorId - Vendor ID
 * @param {function} callback - Called with lead count
 * @returns {function} Unsubscribe function
 */
export async function subscribeToVendorLeads(vendorId, callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, query, where, onSnapshot, orderBy } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    const q = query(
      collection(db, 'leads'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leads = [];
      snapshot.forEach(doc => {
        leads.push({ id: doc.id, ...doc.data() });
      });
      callback(leads);
    }, (error) => {
      console.warn('Vendor leads subscription error:', error);
    });

    activeSubscriptions.set(`vendorLeads-${vendorId}`, unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to vendor leads:', error);
    return () => {};
  }
}

/**
 * Subscribe to real-time dashboard stats (admin)
 * @param {function} callback - Called with stats object
 * @returns {function} Unsubscribe function
 */
export async function subscribeToDashboardStats(callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, onSnapshot } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    const stats = {
      attendees: 0,
      vendors: { total: 0, approved: 0, pending: 0 },
      leads: 0,
      payments: { total: 0, amount: 0 }
    };

    // Subscribe to all collections
    const unsubscribes = [];

    // Attendees
    unsubscribes.push(
      onSnapshot(collection(db, 'attendees'), (snap) => {
        stats.attendees = snap.size;
        callback({ ...stats });
      })
    );

    // Vendors
    unsubscribes.push(
      onSnapshot(collection(db, 'vendors'), (snap) => {
        let approved = 0;
        snap.forEach(doc => {
          if (doc.data().approved) approved++;
        });
        stats.vendors = { total: snap.size, approved, pending: snap.size - approved };
        callback({ ...stats });
      })
    );

    // Leads
    unsubscribes.push(
      onSnapshot(collection(db, 'leads'), (snap) => {
        stats.leads = snap.size;
        callback({ ...stats });
      })
    );

    // Payments
    unsubscribes.push(
      onSnapshot(collection(db, 'payments'), (snap) => {
        let totalAmount = 0;
        snap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'completed') {
            totalAmount += data.amount || 0;
          }
        });
        stats.payments = { total: snap.size, amount: totalAmount };
        callback({ ...stats });
      })
    );

    // Combined unsubscribe
    const unsubscribe = () => {
      unsubscribes.forEach(unsub => unsub());
    };

    activeSubscriptions.set('dashboardStats', unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to dashboard stats:', error);
    return () => {};
  }
}

/**
 * Track vendor online presence
 * Updates vendor's lastActive timestamp
 * @param {string} vendorId - Vendor ID
 */
export async function updateVendorPresence(vendorId) {
  if (!vendorId) return;
  
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { doc, updateDoc, serverTimestamp } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    await updateDoc(doc(db, 'vendors', vendorId), {
      lastActive: serverTimestamp(),
      online: true
    });

    // Set offline when page closes
    window.addEventListener('beforeunload', async () => {
      try {
        await updateDoc(doc(db, 'vendors', vendorId), {
          online: false
        });
      } catch (e) {
        // Ignore errors on page close
      }
    });
  } catch (error) {
    console.warn('Failed to update vendor presence:', error);
  }
}

/**
 * Subscribe to active vendors (online now)
 * @param {function} callback - Called with array of online vendor IDs
 * @returns {function} Unsubscribe function
 */
export async function subscribeToActiveVendors(callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, query, where, onSnapshot } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    const q = query(
      collection(db, 'vendors'),
      where('online', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeVendors = [];
      snapshot.forEach(doc => {
        activeVendors.push({ id: doc.id, ...doc.data() });
      });
      callback(activeVendors);
    });

    activeSubscriptions.set('activeVendors', unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to active vendors:', error);
    return () => {};
  }
}

/**
 * Create a simple real-time notification system
 */
export function createNotificationSubscription(userId, callback) {
  // This would subscribe to a user-specific notifications collection
  // For now, return a mock that can be implemented later
  console.log('Notification subscription created for user:', userId);
  return () => {};
}

/**
 * Live chat message subscription (between vendor and attendee)
 * @param {string} chatId - Chat room ID (e.g., `vendor_${vendorId}_attendee_${attendeeId}`)
 * @param {function} callback - Called with messages array
 * @returns {function} Unsubscribe function
 */
export async function subscribeToChatMessages(chatId, callback) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, query, orderBy, onSnapshot, limit } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });

    activeSubscriptions.set(`chat-${chatId}`, unsubscribe);
    return unsubscribe;
  } catch (error) {
    console.error('Failed to subscribe to chat:', error);
    return () => {};
  }
}

/**
 * Send a chat message
 * @param {string} chatId - Chat room ID
 * @param {object} message - Message object { text, senderId, senderName }
 */
export async function sendChatMessage(chatId, message) {
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { collection, addDoc, serverTimestamp, doc, setDoc } = await import(
      'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js'
    );

    // Update chat metadata
    await setDoc(doc(db, 'chats', chatId), {
      lastMessage: message.text,
      lastMessageAt: serverTimestamp(),
      participants: message.participants || []
    }, { merge: true });

    // Add message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: message.text,
      senderId: message.senderId,
      senderName: message.senderName,
      createdAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return false;
  }
}

/**
 * Cleanup all active subscriptions
 * Call this when navigating away or logging out
 */
export function cleanupSubscriptions() {
  activeSubscriptions.forEach((unsubscribe, key) => {
    try {
      unsubscribe();
    } catch (e) {
      console.warn(`Failed to unsubscribe from ${key}:`, e);
    }
  });
  activeSubscriptions.clear();
}

/**
 * Create a live counter component
 * @param {string} elementId - Element ID to render counter into
 * @param {string} type - 'attendees' | 'vendors' | 'leads'
 */
export async function createLiveCounter(elementId, type) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const subscriptions = {
    attendees: subscribeToAttendeeCount,
    vendors: (cb) => subscribeToVendorCount(data => cb(data.total)),
    leads: subscribeToDashboardStats // Would need to extract leads
  };

  const subscribe = subscriptions[type];
  if (subscribe) {
    await subscribe((count) => {
      const currentValue = parseInt(element.textContent) || 0;
      if (count !== currentValue) {
        // Animate the number change
        animateNumber(element, currentValue, count);
      }
    });
  }
}

/**
 * Animate a number change
 */
function animateNumber(element, from, to, duration = 500) {
  const start = performance.now();
  const diff = to - from;

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + diff * eased);
    
    element.textContent = current.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render a "live" indicator badge
 */
export function renderLiveBadge() {
  return `
    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-400 rounded-full text-xs font-medium">
      <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      LIVE
    </span>
  `;
}
