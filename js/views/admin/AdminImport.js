/**
 * Admin Import Module
 * Handles vendor migration from Scan2Scan and other sources
 */

import { getAdminDb, getFirestoreModule, setButtonLoading } from '../../utils/admin.js';
import { ConfirmDialog, AlertDialog, Toast } from '../../utils/ui.js';

// Track import progress
let importProgress = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  errors: []
};

/**
 * Render the import tab HTML template
 */
export function renderImportTab() {
  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-glass">Vendor Migration</h2>
          <p class="text-glass-secondary text-sm mt-1">Import vendors from Scan2Scan or other sources</p>
        </div>
      </div>

      <!-- Import Options -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- CSV Import -->
        <div class="glass-card p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ion-icon name="document-text-outline" class="text-2xl text-green-400"></ion-icon>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-glass">Bulk CSV Import</h3>
              <p class="text-sm text-glass-secondary">Import multiple vendors from a CSV file</p>
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="border-2 border-dashed border-glass-border rounded-lg p-6 text-center hover:border-brand/50 transition-colors">
              <input type="file" id="csvFileInput" accept=".csv" class="hidden" />
              <label for="csvFileInput" class="cursor-pointer">
                <ion-icon name="cloud-upload-outline" class="text-4xl text-glass-secondary mb-2"></ion-icon>
                <p class="text-glass-secondary">Click to upload CSV file</p>
                <p class="text-xs text-glass-secondary mt-1">or drag and drop</p>
              </label>
            </div>
            <div id="csvFileName" class="text-sm text-glass-secondary hidden"></div>
            <button id="importCsvBtn" class="w-full bg-green-600 px-4 py-3 rounded text-white font-medium disabled:opacity-50" disabled>
              <ion-icon name="cloud-upload-outline" class="mr-2"></ion-icon>
              Import from CSV
            </button>
          </div>
          
          <div class="mt-4 p-3 bg-glass-surface/50 rounded text-xs text-glass-secondary">
            <p class="font-medium mb-1">Required CSV columns:</p>
            <code class="text-brand">name, email, category, phone, booth</code>
            <p class="mt-2">Optional: website, description, address</p>
          </div>
        </div>

        <!-- Manual Import -->
        <div class="glass-card p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ion-icon name="person-add-outline" class="text-2xl text-blue-400"></ion-icon>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-glass">Single Vendor Import</h3>
              <p class="text-sm text-glass-secondary">Manually add a vendor from Scan2Scan</p>
            </div>
          </div>
          
          <form id="manualImportForm" class="space-y-3">
            <div>
              <label class="block text-sm text-glass-secondary mb-1">Business Name *</label>
              <input type="text" name="name" required class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="Acme Home Services" />
            </div>
            <div>
              <label class="block text-sm text-glass-secondary mb-1">Email *</label>
              <input type="email" name="email" required class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="vendor@example.com" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-glass-secondary mb-1">Category *</label>
                <select name="category" required class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass">
                  <option value="">Select...</option>
                  <option value="Home Improvement">Home Improvement</option>
                  <option value="Kitchen & Bath">Kitchen & Bath</option>
                  <option value="Outdoor Living">Outdoor Living</option>
                  <option value="Flooring">Flooring</option>
                  <option value="Windows & Doors">Windows & Doors</option>
                  <option value="Roofing & Siding">Roofing & Siding</option>
                  <option value="HVAC & Energy">HVAC & Energy</option>
                  <option value="Security & Smart Home">Security & Smart Home</option>
                  <option value="Interior Design">Interior Design</option>
                  <option value="Landscaping">Landscaping</option>
                  <option value="Cleaning Services">Cleaning Services</option>
                  <option value="Financial Services">Financial Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-glass-secondary mb-1">Phone</label>
                <input type="tel" name="phone" class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="(555) 123-4567" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-glass-secondary mb-1">Booth #</label>
                <input type="text" name="booth" class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="A-101" />
              </div>
              <div>
                <label class="block text-sm text-glass-secondary mb-1">Website</label>
                <input type="url" name="website" class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="https://..." />
              </div>
            </div>
            <div>
              <label class="block text-sm text-glass-secondary mb-1">Scan2Scan Profile URL (optional)</label>
              <input type="url" name="scan2scanUrl" class="w-full bg-glass-surface border border-glass-border rounded px-3 py-2 text-glass" placeholder="https://scan2scan.com/..." />
            </div>
            <div class="flex items-center gap-2 pt-2">
              <input type="checkbox" id="sendResetEmail" name="sendResetEmail" checked class="accent-brand" />
              <label for="sendResetEmail" class="text-sm text-glass-secondary">Send password reset email to vendor</label>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="autoApprove" name="autoApprove" checked class="accent-brand" />
              <label for="autoApprove" class="text-sm text-glass-secondary">Auto-approve vendor (skip review)</label>
            </div>
            <button type="submit" class="w-full bg-blue-600 px-4 py-3 rounded text-white font-medium mt-2">
              <ion-icon name="person-add-outline" class="mr-2"></ion-icon>
              Import Vendor
            </button>
          </form>
        </div>
      </div>

      <!-- Import Progress -->
      <div id="importProgress" class="glass-card p-6 hidden">
        <h3 class="text-lg font-semibold text-glass mb-4">Import Progress</h3>
        <div class="space-y-4">
          <div class="w-full bg-glass-surface rounded-full h-4 overflow-hidden">
            <div id="progressBar" class="h-full bg-gradient-to-r from-brand to-purple-500 transition-all duration-300" style="width: 0%"></div>
          </div>
          <div class="flex justify-between text-sm">
            <span id="progressText" class="text-glass-secondary">Processing...</span>
            <span id="progressCount" class="text-glass">0 / 0</span>
          </div>
          <div class="grid grid-cols-3 gap-4 text-center">
            <div class="bg-glass-surface/50 rounded p-3">
              <div id="successCount" class="text-2xl font-bold text-green-400">0</div>
              <div class="text-xs text-glass-secondary">Imported</div>
            </div>
            <div class="bg-glass-surface/50 rounded p-3">
              <div id="failedCount" class="text-2xl font-bold text-red-400">0</div>
              <div class="text-xs text-glass-secondary">Failed</div>
            </div>
            <div class="bg-glass-surface/50 rounded p-3">
              <div id="pendingCount" class="text-2xl font-bold text-yellow-400">0</div>
              <div class="text-xs text-glass-secondary">Pending</div>
            </div>
          </div>
        </div>
        <div id="importErrors" class="mt-4 hidden">
          <h4 class="text-sm font-medium text-red-400 mb-2">Errors:</h4>
          <div id="errorList" class="max-h-40 overflow-y-auto space-y-1 text-xs"></div>
        </div>
      </div>

      <!-- Sample CSV Download -->
      <div class="glass-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-glass font-medium">Need a template?</h4>
            <p class="text-sm text-glass-secondary">Download a sample CSV file with the correct format</p>
          </div>
          <button id="downloadTemplateBtn" class="bg-glass-surface border border-glass-border px-4 py-2 rounded text-glass text-sm hover:bg-white/10 transition-colors">
            <ion-icon name="download-outline" class="mr-2"></ion-icon>
            Download Template
          </button>
        </div>
      </div>

      <!-- Recent Imports -->
      <div class="glass-card p-6">
        <h3 class="text-lg font-semibold text-glass mb-4">Recently Imported Vendors</h3>
        <div id="recentImports" class="space-y-2">
          <p class="text-glass-secondary text-sm">Loading...</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Setup import event listeners
 */
export async function setupImportListeners(root) {
  const csvInput = root.querySelector('#csvFileInput');
  const csvFileName = root.querySelector('#csvFileName');
  const importCsvBtn = root.querySelector('#importCsvBtn');
  const manualForm = root.querySelector('#manualImportForm');
  const downloadTemplateBtn = root.querySelector('#downloadTemplateBtn');

  let selectedFile = null;

  // CSV file selection
  if (csvInput) {
    csvInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFile = file;
        csvFileName.textContent = `Selected: ${file.name}`;
        csvFileName.classList.remove('hidden');
        importCsvBtn.disabled = false;
      }
    });

    // Drag and drop support
    const dropZone = csvInput.parentElement;
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brand');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-brand');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        selectedFile = file;
        csvFileName.textContent = `Selected: ${file.name}`;
        csvFileName.classList.remove('hidden');
        importCsvBtn.disabled = false;
      }
    });
  }

  // CSV import button
  if (importCsvBtn) {
    importCsvBtn.addEventListener('click', async () => {
      if (!selectedFile) return;
      
      const confirmed = await ConfirmDialog(
        'Import Vendors',
        `Import vendors from "${selectedFile.name}"? This will create accounts and optionally send password reset emails.`,
        { confirmText: 'Import' }
      );
      if (!confirmed) return;

      await importFromCsv(root, selectedFile);
    });
  }

  // Manual import form
  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(manualForm);
      const vendorData = {
        name: formData.get('name'),
        email: formData.get('email'),
        category: formData.get('category'),
        phone: formData.get('phone'),
        booth: formData.get('booth'),
        website: formData.get('website'),
        scan2scanUrl: formData.get('scan2scanUrl'),
        sendResetEmail: formData.get('sendResetEmail') === 'on',
        autoApprove: formData.get('autoApprove') === 'on'
      };

      const submitBtn = manualForm.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true, 'Importing...');

      try {
        await importSingleVendor(vendorData);
        Toast('Vendor imported successfully!');
        manualForm.reset();
        // Reload recent imports
        loadRecentImports(root);
      } catch (error) {
        console.error('Import error:', error);
        await AlertDialog('Import Failed', error.message || 'Failed to import vendor', { type: 'error' });
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Download template
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', downloadCsvTemplate);
  }

  // Load recent imports
  await loadRecentImports(root);
}

/**
 * Import a single vendor
 */
async function importSingleVendor(data) {
  const { name, email, category, phone, booth, website, scan2scanUrl, sendResetEmail, autoApprove } = data;

  if (!name || !email || !category) {
    throw new Error('Name, email, and category are required');
  }

  // Validate email format
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  const db = await getAdminDb();
  const fsm = await getFirestoreModule();

  // Check if vendor already exists
  const existingQuery = fsm.query(
    fsm.collection(db, 'vendors'),
    fsm.where('contactEmail', '==', email.toLowerCase())
  );
  const existingSnap = await fsm.getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error(`Vendor with email ${email} already exists`);
  }

  // Create Firebase Auth account
  let userRecord = null;
  try {
    // We'll use the admin function to create the user
    const response = await fetch('/.netlify/functions/create-vendor-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.toLowerCase(),
        displayName: name,
        sendPasswordReset: sendResetEmail
      })
    });
    
    if (!response.ok) {
      const errData = await response.json();
      // If user already exists in Auth, we can still proceed
      if (errData.code !== 'auth/email-already-exists') {
        console.warn('Auth account creation issue:', errData);
      }
    } else {
      userRecord = await response.json();
    }
  } catch (authError) {
    console.warn('Could not create auth account (may already exist):', authError);
    // Continue anyway - vendor can use password reset
  }

  // Create vendor document
  const vendorDoc = {
    name: name.trim(),
    contactEmail: email.toLowerCase().trim(),
    category: category,
    phone: phone?.trim() || '',
    booths: booth ? [booth.trim()] : [],
    boothNumber: booth?.trim() || '',
    website: website?.trim() || '',
    scan2scanUrl: scan2scanUrl?.trim() || '',
    approved: autoApprove,
    imported: true,
    importedAt: fsm.serverTimestamp(),
    importSource: 'scan2scan',
    ownerUid: userRecord?.uid || null,
    createdAt: fsm.serverTimestamp()
  };

  await fsm.addDoc(fsm.collection(db, 'vendors'), vendorDoc);

  // If we couldn't create auth account but need to send reset, try anyway
  if (sendResetEmail && !userRecord) {
    try {
      await fetch('/.netlify/functions/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });
    } catch (e) {
      console.warn('Could not send password reset:', e);
    }
  }

  return vendorDoc;
}

/**
 * Import vendors from CSV file
 */
async function importFromCsv(root, file) {
  const progressEl = root.querySelector('#importProgress');
  const progressBar = root.querySelector('#progressBar');
  const progressText = root.querySelector('#progressText');
  const progressCount = root.querySelector('#progressCount');
  const successCount = root.querySelector('#successCount');
  const failedCount = root.querySelector('#failedCount');
  const pendingCount = root.querySelector('#pendingCount');
  const importErrors = root.querySelector('#importErrors');
  const errorList = root.querySelector('#errorList');

  // Show progress UI
  progressEl.classList.remove('hidden');
  importErrors.classList.add('hidden');
  errorList.innerHTML = '';

  // Reset progress
  importProgress = { total: 0, processed: 0, success: 0, failed: 0, errors: [] };

  try {
    // Parse CSV
    const text = await file.text();
    const rows = parseCsv(text);
    
    if (rows.length === 0) {
      throw new Error('CSV file is empty or invalid');
    }

    importProgress.total = rows.length;
    progressCount.textContent = `0 / ${rows.length}`;
    pendingCount.textContent = rows.length;

    // Get import options from form
    const sendResetEmail = root.querySelector('#sendResetEmail')?.checked ?? true;
    const autoApprove = root.querySelector('#autoApprove')?.checked ?? true;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      importProgress.processed++;

      try {
        await importSingleVendor({
          name: row.name || row.business_name || row.company,
          email: row.email || row.contact_email,
          category: row.category || 'Other',
          phone: row.phone || row.contact_phone,
          booth: row.booth || row.booth_number,
          website: row.website || row.url,
          scan2scanUrl: row.scan2scan_url || row.scan2scan,
          sendResetEmail,
          autoApprove
        });
        importProgress.success++;
      } catch (err) {
        importProgress.failed++;
        importProgress.errors.push(`Row ${i + 1} (${row.email || 'no email'}): ${err.message}`);
      }

      // Update progress UI
      const percent = (importProgress.processed / importProgress.total) * 100;
      progressBar.style.width = `${percent}%`;
      progressCount.textContent = `${importProgress.processed} / ${importProgress.total}`;
      successCount.textContent = importProgress.success;
      failedCount.textContent = importProgress.failed;
      pendingCount.textContent = importProgress.total - importProgress.processed;
      progressText.textContent = `Processing row ${importProgress.processed}...`;

      // Small delay to prevent overwhelming
      await new Promise(r => setTimeout(r, 100));
    }

    progressText.textContent = 'Import complete!';

    // Show errors if any
    if (importProgress.errors.length > 0) {
      importErrors.classList.remove('hidden');
      errorList.innerHTML = importProgress.errors.map(e => 
        `<div class="bg-red-500/10 text-red-300 p-2 rounded">${e}</div>`
      ).join('');
    }

    Toast(`Imported ${importProgress.success} vendors successfully`);
    
    // Reload recent imports
    await loadRecentImports(root);

  } catch (error) {
    console.error('CSV import error:', error);
    progressText.textContent = 'Import failed';
    await AlertDialog('Import Failed', error.message, { type: 'error' });
  }
}

/**
 * Parse CSV text into array of objects
 */
function parseCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0].split(',').map(h => 
    h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
  );

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim().replace(/^["']|["']$/g, '') || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line (handles quoted values with commas)
 */
function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

/**
 * Download CSV template
 */
function downloadCsvTemplate() {
  const headers = 'name,email,category,phone,booth,website,description';
  const sampleRow = 'Acme Home Services,contact@acme.com,Home Improvement,(555) 123-4567,A-101,https://acme.com,Quality home improvement services';
  const csvContent = `${headers}\n${sampleRow}`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendor_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
  
  Toast('Template downloaded');
}

/**
 * Load recently imported vendors
 */
async function loadRecentImports(root) {
  const container = root.querySelector('#recentImports');
  if (!container) return;

  try {
    const db = await getAdminDb();
    const fsm = await getFirestoreModule();

    // Query imported vendors, sorted by import date
    const q = fsm.query(
      fsm.collection(db, 'vendors'),
      fsm.where('imported', '==', true),
      fsm.orderBy('importedAt', 'desc'),
      fsm.limit(10)
    );

    const snap = await fsm.getDocs(q);

    if (snap.empty) {
      container.innerHTML = '<p class="text-glass-secondary text-sm">No imported vendors yet</p>';
      return;
    }

    container.innerHTML = snap.docs.map(doc => {
      const v = doc.data();
      const date = v.importedAt?.toDate?.() || new Date();
      return `
        <div class="flex items-center justify-between bg-glass-surface/50 rounded p-3">
          <div>
            <p class="font-medium text-glass">${v.name}</p>
            <p class="text-sm text-glass-secondary">${v.contactEmail}</p>
          </div>
          <div class="text-right">
            <span class="text-xs px-2 py-1 rounded ${v.approved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}">
              ${v.approved ? 'Approved' : 'Pending'}
            </span>
            <p class="text-xs text-glass-secondary mt-1">${date.toLocaleDateString()}</p>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent imports:', error);
    container.innerHTML = '<p class="text-red-400 text-sm">Error loading imports</p>';
  }
}
