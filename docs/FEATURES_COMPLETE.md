# FEATURES_COMPLETE.md

## HomeShow Business Card System - Feature Summary

- **Business Card System**: Attendees and vendors create custom business cards with profile images, backgrounds, and personalized information.
- **Role-based UI**: Attendee (create/share cards), Vendor (receive cards), Organizer flows with dynamic tabbar.
- **Attendee Cards**: Profile image, background image, family size, visiting reasons, bio, location, interests.
- **Vendor Cards**: Home show videos, business card uploads (front/back), social media selection, enhanced profiles.
- **Card Sharing**: Attendees share cards with vendors replacing QR/RFID system.
- **Instagram-style Vendor Gallery**: Scrollable feed of all vendor landing pages with videos, social media, and interactive elements.
- **Enhanced Vendor Profiles**: Background images, profile pics, business card display, home show specific videos, social media integration.
- **Interactive Landing Pages**: Full-screen vendor profiles with hero sections, video overlays, action buttons, business card display.
- **Social Media Integration**: Vendors select which platforms to display, custom social media grid.
- **Onboarding**: Welcome, role selection, business card creation flow.
- **Interactive SVG Map**: Booths, click to view vendor, legend, entrance marker.
- **Registration Wizard**: 3-step, validation, modal confirmation.
- **Card Management**: Vendors view received attendee cards, attendees manage saved vendors.
- **Documentation**: Features, testing guide, role switching, session summary, changelog.
- **UI/UX**: Apple HIG-inspired, Tailwind, Ionicons, modals, toasts, transitions, focus, error/empty states.
- **Persistence**: localStorage, minimal slices, mock data on first load.
- **Routing**: Hash-based, param parsing, navigation helpers, scroll reset.
- **State Management**: Custom store, actions, derivations, subscriptions.
- **No build step**: Pure static, ES modules, CDN assets.

## File List
- index.html
- css/styles.css
- js/app.js, router.js, store.js
- js/api/mockData.js
- js/utils/dom.js, format.js, id.js, qr.js, ui.js
- js/views/Onboarding.js, RoleSelect.js, Home.js, Exhibitors.js, Map.js, InteractiveMap.js, MyCard.js, VendorGallery.js, ShareCard.js, VendorLogin.js, VendorLeads.js, VendorLeadDetail.js, VendorLandingPage.js, VendorRegistration.js, EditVendorProfile.js, SavedVendors.js, SavedBusinessCards.js, Schedule.js, Sponsors.js, AdminDashboard.js, More.js
- docs/FEATURES_COMPLETE.md, TESTING_GUIDE.md, ROLE_SWITCHING_FIX.md, SESSION_COMPLETE.md
- changelog.txt
- assets/ (icons, splash, logos)
