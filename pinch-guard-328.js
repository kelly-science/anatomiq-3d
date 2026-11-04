/* ANATOMIQ_PINCH_GUARD_328
 * Chrome/ChromeOS sends a cancelable ctrl+wheel event for trackpad pinch.
 * Prevent its document/page zoom default without stopping event propagation:
 * three.js OrbitControls (on the renderer canvas) can still zoom the MODEL.
 * Normal scrolling and keyboard browser zoom are intentionally unchanged.
 */
(() => {
  'use strict';
  const options = { capture: true, passive: false };
  document.addEventListener('wheel', event => {
    if (event.ctrlKey && event.cancelable) event.preventDefault();
  }, options);

  // Safari uses nonstandard GestureEvents instead of Chromium's ctrl-wheel.
  // This protects the UI from page magnification; it doesn't synthesize any
  // fake wheel or alter existing AnatomIQ model gestures.
  function preventPageGesture(event) {
    if (event.cancelable) event.preventDefault();
  }
  document.addEventListener('gesturestart', preventPageGesture, options);
  document.addEventListener('gesturechange', preventPageGesture, options);
})();
