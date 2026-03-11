function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function asMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value?.toDate === 'function') {
    try { return value.toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

function uniqueStrings(values = []) {
  return Array.from(
    new Set(
      values
        .map(v => normalizeText(v))
        .filter(Boolean)
    )
  );
}

function bestString(values = []) {
  const list = uniqueStrings(values);
  if (!list.length) return '';
  list.sort((a, b) => b.length - a.length);
  return list[0];
}

function bestCategory(values = []) {
  const list = uniqueStrings(values);
  if (!list.length) return '';
  const preferred = list.find(v => v.toLowerCase() !== 'other');
  return preferred || list[0];
}

function parseBooths(vendor) {
  const booths = [];

  if (Array.isArray(vendor?.booths)) {
    vendor.booths.forEach((value) => {
      const normalized = normalizeText(value);
      if (normalized) booths.push(normalized);
    });
  }

  if (typeof vendor?.booth === 'string' && vendor.booth.trim()) {
    vendor.booth.split(',').forEach((value) => {
      const normalized = normalizeText(value);
      if (normalized) booths.push(normalized);
    });
  }

  if (vendor?.boothNumber) {
    const normalized = normalizeText(vendor.boothNumber);
    if (normalized) booths.push(normalized);
  }

  return uniqueStrings(booths);
}

function profileScore(profile = {}) {
  if (!profile || typeof profile !== 'object') return 0;
  const keys = [
    'backgroundImage',
    'profileImage',
    'businessCardFront',
    'businessCardBack',
    'description',
    'bio',
    'specialOffer',
    'website',
    'homeShowVideo'
  ];
  return keys.reduce((score, key) => score + (normalizeText(profile[key]) ? 1 : 0), 0);
}

function pickPrimaryVendor(records = []) {
  if (!records.length) return null;
  const sorted = [...records].sort((a, b) => {
    const aOwner = normalizeText(a.ownerUid) ? 1 : 0;
    const bOwner = normalizeText(b.ownerUid) ? 1 : 0;
    if (aOwner !== bOwner) return bOwner - aOwner;

    const aApproved = a.approved ? 1 : 0;
    const bApproved = b.approved ? 1 : 0;
    if (aApproved !== bApproved) return bApproved - aApproved;

    const aProfile = profileScore(a.profile);
    const bProfile = profileScore(b.profile);
    if (aProfile !== bProfile) return bProfile - aProfile;

    const aTime = asMillis(a.updatedAt || a.createdAt);
    const bTime = asMillis(b.updatedAt || b.createdAt);
    if (aTime !== bTime) return bTime - aTime;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
  return sorted[0];
}

function mergeProfile(records = [], primary = {}) {
  const profiles = records
    .map(r => (r && typeof r.profile === 'object' ? r.profile : null))
    .filter(Boolean);

  if (!profiles.length) return primary || {};

  const merged = { ...(primary || {}) };
  const keys = new Set(profiles.flatMap((profile) => Object.keys(profile)));

  keys.forEach((key) => {
    const values = profiles.map(profile => profile[key]).filter(v => v !== undefined && v !== null);
    if (!values.length) return;

    if (Array.isArray(values[0])) {
      merged[key] = uniqueStrings(values.flat());
      return;
    }

    if (typeof values[0] === 'boolean') {
      merged[key] = values.some(Boolean);
      return;
    }

    if (typeof values[0] === 'string') {
      merged[key] = bestString(values);
      return;
    }

    merged[key] = values[0];
  });

  return merged;
}

export function vendorSourceIds(vendor) {
  const list = Array.isArray(vendor?._sourceIds) ? vendor._sourceIds : [];
  const normalized = uniqueStrings([...list, vendor?.id]);
  return normalized.length ? normalized : [String(vendor?.id || '')].filter(Boolean);
}

export function vendorMatchesId(vendor, vendorId) {
  const target = normalizeText(vendorId);
  if (!target || !vendor) return false;
  if (String(vendor.id) === target) return true;
  return vendorSourceIds(vendor).includes(target);
}

export function findVendorByAnyId(vendors = [], vendorId) {
  const target = normalizeText(vendorId);
  if (!target) return null;
  return vendors.find(v => vendorMatchesId(v, target)) || null;
}

export function canonicalVendorId(vendors = [], vendorId) {
  return findVendorByAnyId(vendors, vendorId)?.id || normalizeText(vendorId);
}

export function mergeDuplicateVendors(vendors = [], options = {}) {
  const fallbackShowId = normalizeText(options.fallbackShowId || 'putnam-spring-2026').toLowerCase() || 'putnam-spring-2026';
  const groups = new Map();

  vendors.forEach((vendor) => {
    if (!vendor || !vendor.id) return;
    const email = normalizeEmail(vendor.contactEmail || vendor.email);
    const ownerUid = normalizeText(vendor.ownerUid);
    const showId = normalizeText(vendor.showId || fallbackShowId).toLowerCase() || fallbackShowId;
    const baseKey = email ? `email:${email}` : ownerUid ? `uid:${ownerUid}` : `doc:${vendor.id}`;
    const key = `${baseKey}|show:${showId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vendor);
  });

  const merged = [];
  const aliases = {};
  let duplicatesCombined = 0;

  groups.forEach((records) => {
    if (!records.length) return;

    const primary = pickPrimaryVendor(records) || records[0];
    const sourceIds = uniqueStrings(records.map(r => r.id));
    sourceIds.forEach((sourceId) => { aliases[sourceId] = primary.id; });
    if (sourceIds.length > 1) duplicatesCombined += sourceIds.length - 1;

    const booths = uniqueStrings(records.flatMap(parseBooths));
    const showId = normalizeText(primary.showId || fallbackShowId) || fallbackShowId;
    const contractSigned = records.some(r => r.contractSigned === true);
    const contractSignedAt = records.reduce((best, row) => (
      asMillis(row.contractSignedAt) > asMillis(best) ? row.contractSignedAt : best
    ), primary.contractSignedAt || null);
    const contractReminderSentAt = records.reduce((best, row) => (
      asMillis(row.contractReminderSentAt) > asMillis(best) ? row.contractReminderSentAt : best
    ), primary.contractReminderSentAt || null);
    const contractReminderCount = records.reduce((best, row) => (
      Math.max(best, Number(row.contractReminderCount || 0))
    ), Number(primary.contractReminderCount || 0));

    const mergedVendor = {
      ...primary,
      id: primary.id,
      showId,
      name: bestString(records.flatMap(r => [r.name, r.companyName])) || primary.name || primary.companyName || '',
      companyName: bestString(records.flatMap(r => [r.companyName, r.name])) || primary.companyName || primary.name || '',
      contactEmail: normalizeEmail(bestString(records.flatMap(r => [r.contactEmail, r.email]))) || primary.contactEmail || '',
      category: bestCategory(records.map(r => r.category)) || primary.category || '',
      contactPhone: bestString(records.flatMap(r => [r.contactPhone, r.phone])) || primary.contactPhone || primary.phone || '',
      phone: bestString(records.flatMap(r => [r.phone, r.contactPhone])) || primary.phone || primary.contactPhone || '',
      website: bestString(records.map(r => r.website)) || primary.website || '',
      logoUrl: bestString(records.map(r => r.logoUrl)) || primary.logoUrl || '',
      approved: records.some(r => r.approved === true),
      denied: !records.some(r => r.approved === true) && records.some(r => r.denied === true),
      ownerUid: bestString(records.map(r => r.ownerUid)) || primary.ownerUid || '',
      contractRequired: records.some(r => r.contractRequired === true),
      contractSigned,
      contractSignerName: bestString(records.map(r => r.contractSignerName)) || primary.contractSignerName || '',
      contractSignerEmail: bestString(records.map(r => r.contractSignerEmail)) || primary.contractSignerEmail || '',
      contractVersion: bestString(records.map(r => r.contractVersion)) || primary.contractVersion || '',
      contractUrl: bestString(records.map(r => r.contractUrl)) || primary.contractUrl || '',
      contractSignedAt,
      contractReminderSentAt,
      contractReminderCount,
      booths,
      booth: booths.join(', '),
      boothNumber: bestString(records.map(r => r.boothNumber)) || booths[0] || '',
      boothCount: booths.length,
      profile: mergeProfile(records, primary.profile || {}),
      _sourceIds: sourceIds,
      _duplicateCount: sourceIds.length
    };

    merged.push(mergedVendor);
  });

  return { vendors: merged, aliases, duplicatesCombined };
}
