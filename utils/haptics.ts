
// A cute little haptic engine
export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'selection' | 'success' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (style) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(40);
          break;
        case 'heavy':
          navigator.vibrate(70);
          break;
        case 'selection':
          navigator.vibrate(5);
          break;
        case 'success':
           // Two quick taps
          navigator.vibrate([30, 50, 30]);
          break;
      }
    } catch (e) {
      // Ignore haptic errors on unsupported devices
    }
  }
};
