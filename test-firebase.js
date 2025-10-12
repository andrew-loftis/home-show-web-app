// Simple script to test Firebase connection from console
console.log('🔥 Testing Firebase Connection...');

// Check if Firebase is loaded
if (typeof window !== 'undefined') {
  // Test Firebase initialization
  import('./js/firebase.js').then(async (firebase) => {
    console.log('✅ Firebase module loaded');
    
    const initResult = firebase.initFirebase();
    console.log('Firebase init result:', initResult);
    
    if (initResult.initialized) {
      console.log('✅ Firebase initialized successfully');
      
      // Test authentication
      try {
        await firebase.signInAnonymouslyUser();
        console.log('✅ Anonymous authentication successful');
      } catch (error) {
        console.error('❌ Authentication failed:', error);
      }
      
      // Test Firestore read
      try {
        const vendors = await firebase.fetchApprovedVendors();
        console.log(`✅ Firestore read successful: ${vendors.length} vendors found`);
      } catch (error) {
        console.error('❌ Firestore read failed:', error);
      }
      
    } else {
      console.error('❌ Firebase initialization failed:', initResult.error);
    }
  }).catch(error => {
    console.error('❌ Failed to load Firebase module:', error);
  });
} else {
  console.error('❌ Window object not available');
}