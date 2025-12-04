/**
 * Capacitor Native Features
 * Utilities for native mobile functionality when running in Capacitor
 */

// Check if running in Capacitor native environment
export function isNative() {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform();
}

// Get the current platform
export function getPlatform() {
  if (!isNative()) return 'web';
  return window.Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
}

/**
 * Request camera permissions and take photo
 */
export async function takePhoto() {
  if (!isNative()) {
    // Fall back to file input on web
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: reader.result, file });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt // Let user choose camera or gallery
    });

    return { dataUrl: image.dataUrl };
  } catch (error) {
    console.error('Camera error:', error);
    throw error;
  }
}

/**
 * Pick image from gallery
 */
export async function pickImage() {
  if (!isNative()) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: reader.result, file });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });

    return { dataUrl: image.dataUrl };
  } catch (error) {
    console.error('Gallery error:', error);
    throw error;
  }
}

/**
 * Scan QR code using native camera
 */
export async function scanQRCode() {
  if (!isNative()) {
    // On web, we'd need a different library
    throw new Error('QR scanning not available on web. Use native app.');
  }

  try {
    // Using @capacitor-community/barcode-scanner
    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    
    // Check permission
    const status = await BarcodeScanner.checkPermission({ force: true });
    
    if (status.granted) {
      // Hide background and start scanning
      document.body.classList.add('qr-scanning');
      BarcodeScanner.hideBackground();
      
      const result = await BarcodeScanner.startScan();
      
      // Restore background
      document.body.classList.remove('qr-scanning');
      BarcodeScanner.showBackground();
      
      if (result.hasContent) {
        return result.content;
      }
    }
    
    return null;
  } catch (error) {
    document.body.classList.remove('qr-scanning');
    console.error('QR scan error:', error);
    throw error;
  }
}

/**
 * Share content using native share sheet
 */
export async function shareContent(options) {
  const { title, text, url, files } = options;

  if (!isNative() && navigator.share) {
    // Use Web Share API
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
      }
      return false;
    }
  }

  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      
      await Share.share({
        title,
        text,
        url,
        dialogTitle: title
      });
      return true;
    } catch (error) {
      console.error('Native share error:', error);
      return false;
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(url || text);
    return true;
  } catch (error) {
    console.error('Clipboard error:', error);
    return false;
  }
}

/**
 * Get device info
 */
export async function getDeviceInfo() {
  if (!isNative()) {
    return {
      platform: 'web',
      model: navigator.userAgent,
      operatingSystem: navigator.platform,
      isVirtual: false
    };
  }

  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Device info error:', error);
    return { platform: getPlatform() };
  }
}

/**
 * Trigger haptic feedback
 */
export async function hapticFeedback(type = 'light') {
  if (!isNative()) return;

  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    
    const styles = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy
    };
    
    await Haptics.impact({ style: styles[type] || ImpactStyle.Light });
  } catch (error) {
    // Haptics not available
  }
}

/**
 * Show native toast notification
 */
export async function showToast(message, duration = 'short') {
  if (!isNative()) {
    // Web fallback - show custom toast
    showWebToast(message, duration === 'long' ? 3500 : 2000);
    return;
  }

  try {
    const { Toast } = await import('@capacitor/toast');
    await Toast.show({
      text: message,
      duration: duration
    });
  } catch (error) {
    showWebToast(message, 2000);
  }
}

// Web toast fallback
function showWebToast(message, duration) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Request push notification permissions
 */
export async function requestPushPermissions() {
  if (!isNative()) {
    // Web push permissions
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    
    if (permStatus.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Push permission error:', error);
    return false;
  }
}

/**
 * Set up push notification listeners
 */
export async function setupPushListeners(handlers = {}) {
  if (!isNative()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Registration success
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success:', token.value);
      handlers.onRegistration?.(token.value);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      handlers.onRegistrationError?.(error);
    });

    // Received while app is open
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
      handlers.onReceive?.(notification);
    });

    // Tapped/clicked notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      handlers.onAction?.(action);
    });
  } catch (error) {
    console.error('Push listener setup error:', error);
  }
}

/**
 * Open app settings
 */
export async function openAppSettings() {
  if (!isNative()) {
    alert('Please check your browser settings for permissions.');
    return;
  }

  try {
    const { App } = await import('@capacitor/app');
    // Note: This opens system settings on some platforms
    // For app-specific settings, you may need a native plugin
    console.log('Opening app settings...');
  } catch (error) {
    console.error('Could not open settings:', error);
  }
}

/**
 * Check and handle deep links
 */
export async function setupDeepLinks(handler) {
  if (!isNative()) return;

  try {
    const { App } = await import('@capacitor/app');
    
    App.addListener('appUrlOpen', (event) => {
      console.log('Deep link:', event.url);
      handler?.(event.url);
    });
  } catch (error) {
    console.error('Deep link setup error:', error);
  }
}

/**
 * Initialize native features on app start
 */
export async function initNativeFeatures() {
  if (!isNative()) return;

  console.log(`Running on ${getPlatform()} native app`);

  // Set up status bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a1a' });
  } catch (error) {
    // Status bar not available
  }

  // Hide splash screen after a delay
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    setTimeout(() => {
      SplashScreen.hide();
    }, 1000);
  } catch (error) {
    // Splash screen not available
  }
}
