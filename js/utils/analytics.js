/**
 * Admin Analytics Charts
 * Uses Chart.js for data visualization
 */

// Chart.js CDN import
const CHARTJS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';

let Chart = null;
let chartsInitialized = false;

/**
 * Load Chart.js dynamically
 */
async function loadChartJS() {
  if (Chart) return Chart;
  
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      Chart = window.Chart;
      resolve(Chart);
      return;
    }
    
    const script = document.createElement('script');
    script.src = CHARTJS_CDN;
    script.onload = () => {
      Chart = window.Chart;
      resolve(Chart);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Create a line chart for leads over time
 */
export async function createLeadsChart(canvasId, leadsData) {
  await loadChartJS();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  // Process leads data into daily counts
  const dailyCounts = processLeadsByDate(leadsData);
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: dailyCounts.labels,
      datasets: [{
        label: 'Leads Captured',
        data: dailyCounts.values,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { 
            color: '#94a3b8',
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * Create a doughnut chart for vendor categories
 */
export async function createCategoryChart(canvasId, vendors) {
  await loadChartJS();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  // Count by category
  const categories = {};
  vendors.forEach(v => {
    const cat = v.category || 'Uncategorized';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: colors.slice(0, Object.keys(categories).length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8
        }
      }
    }
  });
}

/**
 * Create a bar chart for revenue breakdown
 */
export async function createRevenueChart(canvasId, payments) {
  await loadChartJS();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  // Group by payment status
  const statusGroups = {
    'Paid': 0,
    'Pending': 0,
    'Invoiced': 0
  };
  
  payments.forEach(p => {
    const amount = p.amount || p.totalPrice || 0;
    if (p.paymentStatus === 'paid') {
      statusGroups['Paid'] += amount;
    } else if (p.paymentStatus === 'payment_sent') {
      statusGroups['Invoiced'] += amount;
    } else {
      statusGroups['Pending'] += amount;
    }
  });
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(statusGroups),
      datasets: [{
        label: 'Amount ($)',
        data: Object.values(statusGroups),
        backgroundColor: ['#10B981', '#F59E0B', '#6B7280'],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `$${ctx.raw.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { 
            color: '#94a3b8',
            callback: (val) => '$' + val.toLocaleString()
          }
        }
      }
    }
  });
}

/**
 * Create a line chart for attendee registrations over time
 */
export async function createAttendeesChart(canvasId, attendees) {
  await loadChartJS();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  const dailyCounts = processAttendeesByDate(attendees);
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: dailyCounts.labels,
      datasets: [{
        label: 'New Registrations',
        data: dailyCounts.values,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: 'Cumulative',
        data: dailyCounts.cumulative,
        borderColor: '#8B5CF6',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#cbd5e1' }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

/**
 * Create a horizontal bar chart for top vendors by leads
 */
export async function createTopVendorsChart(canvasId, vendors, leads) {
  await loadChartJS();
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  // Count leads per vendor
  const vendorLeads = {};
  leads.forEach(lead => {
    const vid = lead.vendorId;
    vendorLeads[vid] = (vendorLeads[vid] || 0) + 1;
  });
  
  // Get top 10 vendors
  const sorted = Object.entries(vendorLeads)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const vendorNames = sorted.map(([vid]) => {
    const vendor = vendors.find(v => v.id === vid);
    return vendor?.name || 'Unknown';
  });
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: vendorNames,
      datasets: [{
        label: 'Leads',
        data: sorted.map(([, count]) => count),
        backgroundColor: '#3B82F6',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.1)' },
          ticks: { color: '#94a3b8', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

/**
 * Process leads into daily counts for chart
 */
function processLeadsByDate(leads) {
  const counts = {};
  const now = new Date();
  
  // Initialize last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    counts[key] = 0;
  }
  
  // Count leads
  leads.forEach(lead => {
    let date;
    if (lead.createdAt?.seconds) {
      date = new Date(lead.createdAt.seconds * 1000);
    } else if (lead.createdAt) {
      date = new Date(lead.createdAt);
    } else {
      return;
    }
    const key = date.toISOString().split('T')[0];
    if (counts.hasOwnProperty(key)) {
      counts[key]++;
    }
  });
  
  return {
    labels: Object.keys(counts).map(d => {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    values: Object.values(counts)
  };
}

/**
 * Process attendees into daily counts with cumulative
 */
function processAttendeesByDate(attendees) {
  const counts = {};
  const now = new Date();
  
  // Initialize last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    counts[key] = 0;
  }
  
  // Count attendees
  attendees.forEach(att => {
    let date;
    if (att.createdAt?.seconds) {
      date = new Date(att.createdAt.seconds * 1000);
    } else if (att.createdAt) {
      date = new Date(att.createdAt);
    } else {
      return;
    }
    const key = date.toISOString().split('T')[0];
    if (counts.hasOwnProperty(key)) {
      counts[key]++;
    }
  });
  
  const values = Object.values(counts);
  let cumulative = [];
  let total = attendees.length - values.reduce((a, b) => a + b, 0); // Start with count before window
  values.forEach(v => {
    total += v;
    cumulative.push(total);
  });
  
  return {
    labels: Object.keys(counts).map(d => {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    values,
    cumulative
  };
}

/**
 * Render the analytics dashboard HTML
 */
export function renderAnalyticsDashboard() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-glass">Analytics Dashboard</h2>
        <div class="flex items-center gap-2">
          <select id="analyticsTimeRange" class="bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass text-sm">
            <option value="7">Last 7 days</option>
            <option value="14" selected>Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button id="refreshAnalytics" class="glass-button px-4 py-2">
            <ion-icon name="refresh-outline"></ion-icon>
          </button>
        </div>
      </div>
      
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="kpiCards">
        <div class="glass-card p-4 text-center">
          <div class="text-3xl font-bold text-blue-400" id="kpiTotalLeads">-</div>
          <div class="text-sm text-glass-secondary">Total Leads</div>
          <div class="text-xs text-green-400 mt-1" id="kpiLeadsChange">-</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-3xl font-bold text-green-400" id="kpiTotalRevenue">-</div>
          <div class="text-sm text-glass-secondary">Revenue</div>
          <div class="text-xs text-glass-secondary mt-1" id="kpiPendingRevenue">-</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-3xl font-bold text-purple-400" id="kpiTotalAttendees">-</div>
          <div class="text-sm text-glass-secondary">Attendees</div>
          <div class="text-xs text-green-400 mt-1" id="kpiAttendeesChange">-</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-3xl font-bold text-amber-400" id="kpiTotalVendors">-</div>
          <div class="text-sm text-glass-secondary">Vendors</div>
          <div class="text-xs text-glass-secondary mt-1" id="kpiApprovedVendors">-</div>
        </div>
      </div>
      
      <!-- Charts Row 1 -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-4">
          <h3 class="text-lg font-semibold text-glass mb-4">Leads Over Time</h3>
          <div class="h-64">
            <canvas id="leadsChart"></canvas>
          </div>
        </div>
        <div class="glass-card p-4">
          <h3 class="text-lg font-semibold text-glass mb-4">Revenue Breakdown</h3>
          <div class="h-64">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Charts Row 2 -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="glass-card p-4">
          <h3 class="text-lg font-semibold text-glass mb-4">Vendor Categories</h3>
          <div class="h-64">
            <canvas id="categoryChart"></canvas>
          </div>
        </div>
        <div class="glass-card p-4">
          <h3 class="text-lg font-semibold text-glass mb-4">Attendee Growth</h3>
          <div class="h-64">
            <canvas id="attendeesChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Top Performers -->
      <div class="glass-card p-4">
        <h3 class="text-lg font-semibold text-glass mb-4">Top Vendors by Leads</h3>
        <div class="h-72">
          <canvas id="topVendorsChart"></canvas>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="glass-card p-4">
        <h3 class="text-lg font-semibold text-glass mb-4">Recent Activity</h3>
        <div id="recentActivity" class="space-y-3 max-h-64 overflow-y-auto">
          <div class="text-glass-secondary text-center py-4">Loading activity...</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initialize all analytics charts with data
 */
export async function initAnalyticsCharts(data) {
  const { vendors, attendees, leads, payments } = data;
  
  // Update KPIs
  updateKPIs(data);
  
  // Create charts
  await Promise.all([
    createLeadsChart('leadsChart', leads),
    createRevenueChart('revenueChart', payments || vendors),
    createCategoryChart('categoryChart', vendors),
    createAttendeesChart('attendeesChart', attendees),
    createTopVendorsChart('topVendorsChart', vendors, leads)
  ]);
  
  // Render recent activity
  renderRecentActivity(data);
  
  chartsInitialized = true;
}

/**
 * Update KPI cards
 */
function updateKPIs(data) {
  const { vendors, attendees, leads, payments } = data;
  
  // Total leads
  document.getElementById('kpiTotalLeads').textContent = leads.length.toLocaleString();
  
  // Leads change (last 7 days)
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentLeads = leads.filter(l => {
    const ts = l.createdAt?.seconds ? l.createdAt.seconds * 1000 : new Date(l.createdAt).getTime();
    return ts > weekAgo;
  }).length;
  document.getElementById('kpiLeadsChange').textContent = `+${recentLeads} this week`;
  
  // Revenue
  const paidRevenue = (payments || vendors)
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + (p.amount || p.totalPrice || 0), 0);
  const pendingRevenue = (payments || vendors)
    .filter(p => p.paymentStatus !== 'paid')
    .reduce((sum, p) => sum + (p.amount || p.totalPrice || 0), 0);
  
  document.getElementById('kpiTotalRevenue').textContent = '$' + paidRevenue.toLocaleString();
  document.getElementById('kpiPendingRevenue').textContent = `$${pendingRevenue.toLocaleString()} pending`;
  
  // Attendees
  document.getElementById('kpiTotalAttendees').textContent = attendees.length.toLocaleString();
  const recentAttendees = attendees.filter(a => {
    const ts = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
    return ts > weekAgo;
  }).length;
  document.getElementById('kpiAttendeesChange').textContent = `+${recentAttendees} this week`;
  
  // Vendors
  document.getElementById('kpiTotalVendors').textContent = vendors.length.toLocaleString();
  const approvedVendors = vendors.filter(v => v.approved).length;
  document.getElementById('kpiApprovedVendors').textContent = `${approvedVendors} approved`;
}

/**
 * Render recent activity feed
 */
function renderRecentActivity(data) {
  const { vendors, attendees, leads } = data;
  const activities = [];
  
  // Collect activities
  leads.slice(0, 20).forEach(lead => {
    const ts = lead.createdAt?.seconds ? lead.createdAt.seconds * 1000 : new Date(lead.createdAt).getTime();
    const vendor = vendors.find(v => v.id === lead.vendorId);
    activities.push({
      type: 'lead',
      icon: 'person-add-outline',
      color: 'text-blue-400',
      message: `New lead for ${vendor?.name || 'Unknown vendor'}`,
      timestamp: ts
    });
  });
  
  vendors.forEach(v => {
    const ts = v.createdAt?.seconds ? v.createdAt.seconds * 1000 : new Date(v.createdAt).getTime();
    activities.push({
      type: 'vendor',
      icon: 'storefront-outline',
      color: 'text-green-400',
      message: `${v.name} registered as vendor`,
      timestamp: ts
    });
  });
  
  // Sort by timestamp and take top 10
  activities.sort((a, b) => b.timestamp - a.timestamp);
  const recent = activities.slice(0, 10);
  
  const container = document.getElementById('recentActivity');
  if (!container) return;
  
  if (recent.length === 0) {
    container.innerHTML = '<div class="text-glass-secondary text-center py-4">No recent activity</div>';
    return;
  }
  
  container.innerHTML = recent.map(a => `
    <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
      <div class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${a.color}">
        <ion-icon name="${a.icon}"></ion-icon>
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm text-glass truncate">${a.message}</div>
        <div class="text-xs text-glass-secondary">${formatTimeAgo(a.timestamp)}</div>
      </div>
    </div>
  `).join('');
}

/**
 * Format timestamp as "X ago"
 */
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default {
  renderAnalyticsDashboard,
  initAnalyticsCharts,
  createLeadsChart,
  createRevenueChart,
  createCategoryChart,
  createAttendeesChart,
  createTopVendorsChart
};
