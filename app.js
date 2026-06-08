(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let highestZIndex = 100;
  const openWindows = new Set();

  // Icon layout constants
  const ICON_WIDTH   = 80;   // matches .desktop-icon width in CSS
  const ICON_HEIGHT  = 104;  // ~64px image + ~20px label + padding
  const ICON_GAP_X   = 24;
  const ICON_GAP_Y   = 24;
  const ICON_MARGIN  = 32;   // distance from left/top viewport edge

  // Compute initial icon positions dynamically so they wrap into rows on
  // narrow viewports and scale to any number of icons.
  function computeIconPositions(keys) {
    const available    = window.innerWidth - ICON_MARGIN * 2;
    const iconsPerRow  = Math.max(1, Math.floor((available + ICON_GAP_X) / (ICON_WIDTH + ICON_GAP_X)));
    const positions    = {};

    keys.forEach((key, i) => {
      const col = i % iconsPerRow;
      const row = Math.floor(i / iconsPerRow);
      positions[key] = {
        x: ICON_MARGIN + col * (ICON_WIDTH  + ICON_GAP_X),
        y: ICON_MARGIN + row * (ICON_HEIGHT + ICON_GAP_Y),
      };
    });

    return positions;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getBoundaries() {
    return {
      borderTop:    16,
      borderLeft:   16,
      borderRight:  window.innerWidth  - 16,
      borderBottom: window.innerHeight - 16,
    };
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    setupIcons();
    setupViewportResizeHandler();
  }

  // ── Icon drag + click logic ────────────────────────────────────────────────
  // Extracted and adapted from archive.liquid ~lines 410–540.
  // Key change: icons start at fixed positions instead of random ones.

  function setupIcons() {
    const icons    = document.querySelectorAll('.desktop-icon');
    const keys     = Array.from(icons).map(el => el.dataset.window);
    const positions = computeIconPositions(keys);

    icons.forEach(icon => {
      const windowKey = icon.dataset.window;
      const pos = positions[windowKey] || { x: ICON_MARGIN, y: ICON_MARGIN };

      // Set initial fixed position
      icon.style.position = 'fixed';
      icon.style.left = pos.x + 'px';
      icon.style.top  = pos.y + 'px';
      icon.style.zIndex = '10';

      let isDragging = false;
      let hasMoved   = false;
      let startX, startY;
      let currentLeft = pos.x;
      let currentTop  = pos.y;

      const handleDragStart = (e) => {
        isDragging = true;
        hasMoved   = false;
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        icon.style.zIndex = '1000';
      };

      icon.addEventListener('mousedown',  handleDragStart);
      icon.addEventListener('touchstart', handleDragStart, { passive: false });

      const handleDragMove = (e) => {
        if (!isDragging) return;

        const touch  = e.touches ? e.touches[0] : e;
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          if (!hasMoved) e.preventDefault();
          hasMoved = true;
        }

        let newX = currentLeft + deltaX;
        let newY = currentTop  + deltaY;

        icon.style.left = newX + 'px';
        icon.style.top  = newY + 'px';

        const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();
        const rect = icon.getBoundingClientRect();

        if (rect.left   < borderLeft)   newX += borderLeft   - rect.left;
        if (rect.right  > borderRight)  newX -= rect.right   - borderRight;
        if (rect.top    < borderTop)    newY += borderTop    - rect.top;
        if (rect.bottom > borderBottom) newY -= rect.bottom  - borderBottom;

        icon.style.left = newX + 'px';
        icon.style.top  = newY + 'px';
      };

      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('touchmove', handleDragMove, { passive: false });

      const handleDragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        icon.style.zIndex = '10';

        if (hasMoved) {
          const rect  = icon.getBoundingClientRect();
          currentLeft = rect.left;
          currentTop  = rect.top;
          e.preventDefault();
          e.stopPropagation();
        }
      };

      document.addEventListener('mouseup',  handleDragEnd);
      document.addEventListener('touchend', handleDragEnd);

      // hasMoved flag distinguishes a drag from a click (same pattern as archive.liquid)
      icon.addEventListener('click', (e) => {
        if (hasMoved) {
          e.preventDefault();
          e.stopPropagation();
          hasMoved = false;
        } else {
          openWindow(windowKey, icon);
        }
      });
    });
  }

  // ── openWindow() ──────────────────────────────────────────────────────────
  // Adapted from openFolderWindow() in archive.liquid.
  // Simplified boundary constants (no Shopify header offset).

  function openWindow(windowKey, iconEl) {
    const windowId = 'window-' + windowKey;

    // If already open, just bring to front
    if (openWindows.has(windowId)) {
      const existing = document.getElementById(windowId);
      if (existing) {
        existing.style.zIndex = ++highestZIndex;
        return;
      }
      openWindows.delete(windowId);
    }

    const windowEl = document.getElementById(windowId);
    if (!windowEl) return;

    openWindows.add(windowId);

    const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();
    const maxAvailableWidth  = borderRight  - borderLeft;
    const maxAvailableHeight = borderBottom - borderTop;

    const iconRect    = iconEl.getBoundingClientRect();
    let windowWidth   = Math.min(42 * 16, maxAvailableWidth);  // 42rem → px, capped
    let windowHeight  = Math.min(400, maxAvailableHeight);

    // Position to the right of the icon; fall back to left if no room
    let windowLeft = iconRect.right + 20;
    let windowTop  = iconRect.top;

    if (windowLeft + windowWidth > borderRight) {
      windowLeft = iconRect.left - windowWidth - 20;
    }
    if (windowLeft < borderLeft) windowLeft = borderLeft;
    if (windowLeft + windowWidth > borderRight) {
      windowLeft = Math.max(borderLeft, borderRight - windowWidth);
    }
    if (windowTop < borderTop) windowTop = borderTop;
    if (windowTop + windowHeight > borderBottom) {
      windowTop = Math.max(borderTop, borderBottom - windowHeight);
    }

    windowEl.style.position = 'fixed';
    windowEl.style.left     = windowLeft  + 'px';
    windowEl.style.top      = windowTop   + 'px';
    windowEl.style.width    = windowWidth + 'px';
    windowEl.style.height   = windowHeight + 'px';
    windowEl.style.zIndex   = ++highestZIndex;
    windowEl.style.display  = 'block';

    // Guard: only wire up drag/resize/controls once per window element lifetime
    if (!windowEl.dataset.initialized) {
      makeWindowDraggable(windowEl);
      makeWindowResizable(windowEl);
      setupWindowControls(windowEl, windowId);
      windowEl.dataset.initialized = 'true';
    }

    // Phase 2 hook — no-op in Phase 1 (content is already in the HTML)
    renderWindowContent(windowKey, [], windowEl);
  }

  // ── makeWindowDraggable() ─────────────────────────────────────────────────
  // Extracted verbatim from archive.liquid, boundaries simplified.

  function makeWindowDraggable(windowEl) {
    const titleBar    = windowEl.querySelector('.folder-window__title-bar');
    const controlsArea = windowEl.querySelector('.folder-window__controls');

    titleBar.style.cursor = 'move';
    if (controlsArea) controlsArea.style.cursor = 'default';

    let isDragging = false;
    let startX, startY, currentLeft, currentTop;

    const handleDragStart = (e) => {
      if (e.target.closest('.folder-window__controls')) return;
      isDragging = true;

      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      const rect  = windowEl.getBoundingClientRect();
      currentLeft = rect.left;
      currentTop  = rect.top;

      windowEl.style.zIndex = ++highestZIndex;
      e.preventDefault();
    };

    titleBar.addEventListener('mousedown',  handleDragStart);
    titleBar.addEventListener('touchstart', handleDragStart, { passive: false });

    const handleDragMove = (e) => {
      if (!isDragging) return;

      const touch  = e.touches ? e.touches[0] : e;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      let newX = currentLeft + deltaX;
      let newY = currentTop  + deltaY;

      windowEl.style.left = newX + 'px';
      windowEl.style.top  = newY + 'px';

      const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();
      const rect = windowEl.getBoundingClientRect();

      if (rect.left   < borderLeft)   newX += borderLeft   - rect.left;
      if (rect.right  > borderRight)  newX -= rect.right   - borderRight;
      if (rect.top    < borderTop)    newY += borderTop    - rect.top;
      if (rect.bottom > borderBottom) newY -= rect.bottom  - borderBottom;

      windowEl.style.left = newX + 'px';
      windowEl.style.top  = newY + 'px';
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });

    const handleDragEnd = () => {
      isDragging = false;
    };

    document.addEventListener('mouseup',  handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    // Clicking anywhere on the window brings it to front
    windowEl.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.folder-window__controls')) {
        windowEl.style.zIndex = ++highestZIndex;
      }
    });
    windowEl.addEventListener('touchstart', (e) => {
      if (!e.target.closest('.folder-window__controls')) {
        windowEl.style.zIndex = ++highestZIndex;
      }
    });
  }

  // ── makeWindowResizable() ─────────────────────────────────────────────────
  // Extracted verbatim from archive.liquid.

  function makeWindowResizable(windowEl) {
    const handles   = windowEl.querySelectorAll('.resize-handle');
    const minWidth  = Math.max(200, window.innerWidth  * 0.15);
    const minHeight = Math.max(150, window.innerHeight * 0.15);

    handles.forEach(handle => {
      let isResizing = false;
      let startX, startY, startWidth, startHeight, startLeft, startTop;

      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;

        const rect  = windowEl.getBoundingClientRect();
        startWidth  = rect.width;
        startHeight = rect.height;
        startLeft   = rect.left;
        startTop    = rect.top;

        windowEl.style.zIndex = ++highestZIndex;
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const cl     = handle.classList;

        let newWidth  = startWidth;
        let newHeight = startHeight;
        let newLeft   = startLeft;
        let newTop    = startTop;

        if (cl.contains('resize-handle-right') ||
            cl.contains('resize-handle-top-right') ||
            cl.contains('resize-handle-bottom-right')) {
          newWidth = Math.max(minWidth, startWidth + deltaX);
        }

        if (cl.contains('resize-handle-left') ||
            cl.contains('resize-handle-top-left') ||
            cl.contains('resize-handle-bottom-left')) {
          newWidth = Math.max(minWidth, startWidth - deltaX);
          if (newWidth > minWidth) newLeft = startLeft + deltaX;
        }

        if (cl.contains('resize-handle-bottom') ||
            cl.contains('resize-handle-bottom-left') ||
            cl.contains('resize-handle-bottom-right')) {
          newHeight = Math.max(minHeight, startHeight + deltaY);
        }

        if (cl.contains('resize-handle-top') ||
            cl.contains('resize-handle-top-left') ||
            cl.contains('resize-handle-top-right')) {
          newHeight = Math.max(minHeight, startHeight - deltaY);
          if (newHeight > minHeight) newTop = startTop + deltaY;
        }

        const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();

        if (newLeft < borderLeft) newLeft = borderLeft;
        if (newTop  < borderTop)  newTop  = borderTop;

        const maxWidth  = borderRight  - newLeft;
        const maxHeight = borderBottom - newTop;
        if (newWidth  > maxWidth)  newWidth  = maxWidth;
        if (newHeight > maxHeight) newHeight = maxHeight;

        windowEl.style.width  = newWidth  + 'px';
        windowEl.style.height = newHeight + 'px';
        windowEl.style.left   = newLeft   + 'px';
        windowEl.style.top    = newTop    + 'px';

        windowEl.dispatchEvent(new Event('manualresize'));
      });

      document.addEventListener('mouseup', () => {
        isResizing = false;
      });
    });
  }

  // ── setupWindowControls() ─────────────────────────────────────────────────
  // Extracted verbatim from archive.liquid (Doom cleanup code removed).

  function setupWindowControls(windowEl, windowId) {
    const controlsEl     = windowEl.querySelector('.folder-window__controls');

    const minimizeBtnRect  = controlsEl.querySelector('.minimize-btn');
    const minimizeSymbols  = Array.from(minimizeBtnRect.closest('svg').querySelectorAll('.btn-symbol'));
    const maximizeBtnRect  = controlsEl.querySelector('.maximize-btn');
    const maximizeSymbols  = Array.from(maximizeBtnRect.closest('svg').querySelectorAll('.btn-symbol'));
    const closeBtnRect     = controlsEl.querySelector('.close-btn');
    const closeSymbols     = Array.from(closeBtnRect.closest('svg').querySelectorAll('.btn-symbol'));

    // ── Close ──
    closeBtnRect.style.cursor = 'pointer';

    closeBtnRect.addEventListener('click', (e) => {
      e.stopPropagation();
      if (windowEl.style.display === 'none') return;

      // Visual feedback: invert button
      closeBtnRect.style.fill = '#000000';
      closeSymbols.forEach(s => s.style.fill = '#FFFFFF');

      setTimeout(() => {
        // Reset visual
        closeBtnRect.style.fill = '';
        closeSymbols.forEach(s => s.style.fill = '');

        windowEl.style.display = 'none';
        openWindows.delete(windowId);

        // Reset all state so the window is clean when re-opened
        windowEl.classList.remove('minimized');
        delete windowEl.dataset.maximized;
        delete windowEl.dataset.originalWidth;
        delete windowEl.dataset.originalHeight;
        delete windowEl.dataset.originalLeft;
        delete windowEl.dataset.originalTop;

        const contentArea = windowEl.querySelector('.folder-window__content');
        if (contentArea) contentArea.style.display = '';
      }, 100);
    });

    // ── Minimize ──
    minimizeBtnRect.style.cursor = 'pointer';

    minimizeBtnRect.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMinimized = windowEl.classList.contains('minimized');
      const contentArea = windowEl.querySelector('.folder-window__content');

      if (isMinimized) {
        windowEl.style.height = windowEl.dataset.restoreHeight || '';
        if (contentArea) contentArea.style.display = '';
        minimizeBtnRect.style.fill = '';
        minimizeSymbols.forEach(s => s.style.fill = '');
        windowEl.classList.remove('minimized');
      } else {
        windowEl.dataset.restoreHeight = windowEl.style.height;
        windowEl.style.height = '35px';
        if (contentArea) contentArea.style.display = 'none';
        minimizeBtnRect.style.fill = '#000000';
        minimizeSymbols.forEach(s => s.style.fill = '#FFFFFF');
        windowEl.classList.add('minimized');
      }
    });

    // ── Maximize ──
    maximizeBtnRect.style.cursor = 'pointer';

    maximizeBtnRect.addEventListener('click', (e) => {
      e.stopPropagation();

      // If currently minimized, restore content first
      if (windowEl.classList.contains('minimized')) {
        const contentArea = windowEl.querySelector('.folder-window__content');
        if (contentArea) contentArea.style.display = '';
        windowEl.classList.remove('minimized');
        minimizeBtnRect.style.fill = '';
        minimizeSymbols.forEach(s => s.style.fill = '');
      }

      const isMaximized = windowEl.dataset.maximized === 'true';

      if (isMaximized) {
        // Restore original size and position
        windowEl.style.width  = windowEl.dataset.originalWidth;
        windowEl.style.height = windowEl.dataset.originalHeight;
        windowEl.style.left   = windowEl.dataset.originalLeft;
        windowEl.style.top    = windowEl.dataset.originalTop;
        windowEl.style.bottom = '';
        windowEl.dataset.maximized = 'false';

        maximizeBtnRect.style.fill = '';
        maximizeSymbols.forEach(s => s.style.fill = '');
      } else {
        // Store current dimensions before maximizing
        const rect = windowEl.getBoundingClientRect();
        windowEl.dataset.originalWidth  = rect.width  + 'px';
        windowEl.dataset.originalHeight = rect.height + 'px';
        windowEl.dataset.originalLeft   = rect.left   + 'px';
        windowEl.dataset.originalTop    = rect.top    + 'px';

        const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();

        windowEl.style.left   = borderLeft + 'px';
        windowEl.style.top    = borderTop  + 'px';
        windowEl.style.bottom = '';
        windowEl.style.width  = (borderRight  - borderLeft) + 'px';
        windowEl.style.height = (borderBottom - borderTop)  + 'px';
        windowEl.dataset.maximized = 'true';

        maximizeBtnRect.style.fill = '#000000';
        maximizeSymbols.forEach(s => s.style.fill = '#FFFFFF');
      }
    });

    // Reset maximize button when user manually resizes via drag handle
    windowEl.addEventListener('manualresize', () => {
      if (windowEl.dataset.maximized === 'true') {
        windowEl.dataset.maximized = 'false';
        maximizeBtnRect.style.fill = '';
        maximizeSymbols.forEach(s => s.style.fill = '');
      }
    });
  }

  // ── Viewport resize: constrain icons and windows ───────────────────────────

  function setupViewportResizeHandler() {
    window.addEventListener('resize', () => {
      const { borderTop, borderLeft, borderRight, borderBottom } = getBoundaries();

      document.querySelectorAll('.desktop-icon').forEach(icon => {
        const rect = icon.getBoundingClientRect();
        let left = rect.left;
        let top  = rect.top;
        if (rect.left   < borderLeft)   left = borderLeft;
        if (rect.right  > borderRight)  left = borderRight - rect.width;
        if (rect.top    < borderTop)    top  = borderTop;
        if (rect.bottom > borderBottom) top  = borderBottom - rect.height;
        icon.style.left = left + 'px';
        icon.style.top  = top  + 'px';
      });

      document.querySelectorAll('.folder-window').forEach(windowEl => {
        if (windowEl.style.display === 'none') return;
        const rect = windowEl.getBoundingClientRect();
        let left = rect.left;
        let top  = rect.top;
        if (rect.left   < borderLeft)   left = borderLeft;
        if (rect.right  > borderRight)  left = borderRight - rect.width;
        if (rect.top    < borderTop)    top  = borderTop;
        if (rect.bottom > borderBottom) top  = borderBottom - rect.height;
        windowEl.style.left = left + 'px';
        windowEl.style.top  = top  + 'px';
      });
    });
  }

  // ── renderWindowContent() — Phase 2 hook ──────────────────────────────────
  //
  // Phase 1: window content is hardcoded in index.html — this is a no-op.
  //
  // Phase 2 (Sanity CMS): call this after openWindow() to dynamically populate
  // the window's .folder-window__content with content from the Sanity API.
  // Swapping to dynamic content only requires changing what's passed in here,
  // not restructuring the rest of the app.
  //
  // @param {string}      iconId       - Window identifier, e.g. 'maps'
  // @param {Array}       contentArray - Array of Sanity content block objects
  // @param {HTMLElement} windowEl     - The .folder-window element to populate
  //
  function renderWindowContent(iconId, contentArray, windowEl) {
    // Phase 1: no-op — content is already in the HTML.
    //
    // Phase 2 example:
    //   const area = windowEl.querySelector('.folder-window__content');
    //   area.innerHTML = contentArray.map(block => renderBlock(block)).join('');
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
