import { hasSeenWalkthrough, setWalkthroughSeen } from '../store.js';

// Minimal tour helper utilities. Extend as needed.
export function shouldShowTour(key = 'general') {
	return !hasSeenWalkthrough(key);
}

export function markTourComplete(key = 'general') {
	setWalkthroughSeen(key, true);
}

export function maybeRunTour(key = 'general', runner) {
	try {
		if (!hasSeenWalkthrough(key)) {
			if (typeof runner === 'function') runner();
			setWalkthroughSeen(key, true);
		}
	} catch {}
}
