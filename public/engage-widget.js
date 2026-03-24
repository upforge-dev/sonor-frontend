// public/engage-widget.js
// Embeddable Echo chat widget for tenant websites
// Include via: <script src="https://app.sonor.io/engage-widget.js" data-api-key="UPTRADE_API_KEY" async></script>
// Optional: data-signal-url, data-portal-url (for custom Signal/Portal implementations)
//
// One env var: UPTRADE_API_KEY. Project is resolved from the key.
// Features: AI chat (Signal Echo), human handoff (Portal), popups/banners.

(function() {
  'use strict';

  // Configuration (overridable: data-portal-url, data-portal-api-url or data-sonor-api-url, data-signal-url)
  let PORTAL_URL = 'https://app.sonor.io';
  let PORTAL_API_URL = 'https://api.sonor.io';
  let SIGNAL_URL = 'https://signal.sonor.io';
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ANIMATED ECHO LOGO SVG
  // ═══════════════════════════════════════════════════════════════════════════════
  const ECHO_LOGO_SVG = `
<svg viewBox="0 0 484.21 482.45" class="echo-logo-svg">
  <defs>
    <filter id="echo-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g fill="currentColor">
    <!-- Outer chat bubble shell -->
    <path d="M484.21,242.1c0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-5.38s0-.02,0-.03V90.55c0-9.34,7.64-16.98,16.98-16.98s16.98,7.64,16.98,16.98v273.08s0,.02,0,.03v57.02c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57Z">
      <animateTransform attributeName="transform" type="scale" values="1;1.02;1" dur="4s" repeatCount="indefinite" additive="sum"/>
    </path>
    
    <!-- Left sound bar -->
    <path class="echo-bar echo-bar-left" d="M204.49,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z">
      <animateTransform attributeName="transform" type="scale" values="1 1;1 0.85;1 1" dur="2s" repeatCount="indefinite"/>
    </path>
    
    <!-- Right sound bar -->
    <path class="echo-bar echo-bar-right" d="M313.68,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z">
      <animateTransform attributeName="transform" type="scale" values="1 1;1 0.9;1 1" dur="2.5s" repeatCount="indefinite"/>
    </path>
    
    <!-- Left echo wave -->
    <path class="echo-wave echo-wave-left" d="M149.35,297.17v-105.68c0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1,0,52.76-54.06,49.84-54.06,52.84,0,3.49,54.06,0,54.06,52.84,0,7.21,7.64,13.1,16.98,13.1h0c9.34,0,16.98-5.9,16.98-13.1Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;-8 0;0 0" dur="3s" repeatCount="indefinite" additive="sum"/>
      <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite"/>
    </path>
    
    <!-- Right echo wave -->
    <path class="echo-wave echo-wave-right" d="M351.84,310.27h0c9.34,0,16.98-5.9,16.98-13.1,0-52.84,54.06-49.3,54.06-52.84,0-3.1-54.06-.08-54.06-52.84,0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1v105.68c0,7.21,7.64,13.1,16.98,13.1Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;8 0;0 0" dur="3s" repeatCount="indefinite" additive="sum"/>
      <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite"/>
    </path>
  </g>
</svg>`;

  // Listening state (faster animation) - used when AI is processing
  const ECHO_LOGO_LISTENING_SVG = `
<svg viewBox="0 0 484.21 482.45" class="echo-logo-svg echo-listening">
  <defs>
    <filter id="echo-glow-active" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g fill="currentColor" style="filter: url(#echo-glow-active)">
    <path d="M484.21,242.1c0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-5.38s0-.02,0-.03V90.55c0-9.34,7.64-16.98,16.98-16.98s16.98,7.64,16.98,16.98v273.08s0,.02,0,.03v57.02c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57Z"/>
    <path class="echo-bar" d="M204.49,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z">
      <animateTransform attributeName="transform" type="scale" values="1 1;1 0.6;1 0.85;1 0.5;1 1" dur="1s" repeatCount="indefinite"/>
    </path>
    <path class="echo-bar" d="M313.68,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z">
      <animateTransform attributeName="transform" type="scale" values="1 1;1 0.5;1 0.9;1 0.4;1 1" dur="0.8s" repeatCount="indefinite"/>
    </path>
    <path class="echo-wave" d="M149.35,297.17v-105.68c0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1,0,52.76-54.06,49.84-54.06,52.84,0,3.49,54.06,0,54.06,52.84,0,7.21,7.64,13.1,16.98,13.1h0c9.34,0,16.98-5.9,16.98-13.1Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;-8 0;0 0" dur="0.5s" repeatCount="indefinite" additive="sum"/>
      <animate attributeName="opacity" values="1;0.6;1;0.4;1" dur="0.5s" repeatCount="indefinite"/>
    </path>
    <path class="echo-wave" d="M351.84,310.27h0c9.34,0,16.98-5.9,16.98-13.1,0-52.84,54.06-49.3,54.06-52.84,0-3.1-54.06-.08-54.06-52.84,0-7.21-7.64-13.1-16.98-13.1h0c-9.34,0-16.98,5.9-16.98,13.1v105.68c0,7.21,7.64,13.1,16.98,13.1Z">
      <animateTransform attributeName="transform" type="translate" values="0 0;8 0;0 0" dur="0.5s" repeatCount="indefinite" additive="sum"/>
      <animate attributeName="opacity" values="1;0.4;1;0.6;1" dur="0.5s" repeatCount="indefinite"/>
    </path>
  </g>
</svg>`;

  // State
  let config = null;
  let apiKey = null;
  let sessionId = null;
  let visitorId = null;
  let echoSocket = null;
  let isOpen = false;
  let messages = [];
  let pollingInterval = null;
  let lastMessageTime = null;
  let realtimeChannel = null;
  let isWaitingForAI = false;
  let aiConversationHistory = [];
  let activeElements = []; // Popups, banners, etc.
  let displayedElements = new Set(); // Track displayed elements this session

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENGAGE-014: FREQUENCY CAPPING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const FREQUENCY_STORAGE_KEY = 'engage_element_frequency';
  
  /**
   * Get frequency data from localStorage
   */
  function getFrequencyData() {
    try {
      const data = localStorage.getItem(FREQUENCY_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }
  
  /**
   * Save frequency data to localStorage
   */
  function saveFrequencyData(data) {
    try {
      localStorage.setItem(FREQUENCY_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Engage] Failed to save frequency data');
    }
  }
  
  /**
   * Check if element should be shown based on frequency cap
   * @param {Object} element - Element with frequency_cap property
   * @returns {boolean} - True if element should be shown
   */
  function shouldShowElement(element) {
    const cap = element.frequency_cap || 'session';
    const elementId = element.id;
    
    // No limit - always show
    if (cap === 'none') {
      return true;
    }
    
    // Session-based - check session storage
    if (cap === 'session') {
      return !displayedElements.has(elementId);
    }
    
    const frequencyData = getFrequencyData();
    const elementData = frequencyData[elementId];
    
    if (!elementData) {
      return true;
    }
    
    const now = Date.now();
    
    // Once - show once per visitor (forever)
    if (cap === 'once') {
      return !elementData.shown;
    }
    
    // Daily - once per day (24 hours)
    if (cap === 'daily') {
      const oneDayMs = 24 * 60 * 60 * 1000;
      const lastShown = elementData.lastShown || 0;
      return (now - lastShown) > oneDayMs;
    }
    
    // Weekly - once per week
    if (cap === 'weekly') {
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const lastShown = elementData.lastShown || 0;
      return (now - lastShown) > oneWeekMs;
    }
    
    return true;
  }
  
  /**
   * Mark element as shown for frequency capping
   * @param {Object} element - Element that was shown
   */
  function markElementShown(element) {
    const cap = element.frequency_cap || 'session';
    const elementId = element.id;
    
    // Session-based - just track in memory
    if (cap === 'session') {
      displayedElements.add(elementId);
      return;
    }
    
    // Persistent caps - save to localStorage
    if (['once', 'daily', 'weekly'].includes(cap)) {
      const frequencyData = getFrequencyData();
      frequencyData[elementId] = {
        shown: true,
        lastShown: Date.now(),
        showCount: (frequencyData[elementId]?.showCount || 0) + 1
      };
      saveFrequencyData(frequencyData);
    }
  }
  
  /**
   * Clean up old frequency data (older than 30 days)
   */
  function cleanupFrequencyData() {
    const frequencyData = getFrequencyData();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    let cleaned = false;
    for (const elementId in frequencyData) {
      if (frequencyData[elementId].lastShown < thirtyDaysAgo) {
        delete frequencyData[elementId];
        cleaned = true;
      }
    }
    
    if (cleaned) {
      saveFrequencyData(frequencyData);
    }
  }

  // Get apiKey and optional URLs from script tag (one env var: UPTRADE_API_KEY)
  const scriptTag = document.currentScript || document.querySelector('script[data-api-key]');
  if (!scriptTag) {
    console.error('[Engage] No script tag found with data-api-key attribute');
    return;
  }
  apiKey = scriptTag.getAttribute('data-api-key');
  if (!apiKey) {
    console.error('[Engage] Missing data-api-key attribute (set UPTRADE_API_KEY)');
    return;
  }
  if (scriptTag.getAttribute('data-signal-url')) SIGNAL_URL = scriptTag.getAttribute('data-signal-url');
  if (scriptTag.getAttribute('data-portal-url')) PORTAL_URL = scriptTag.getAttribute('data-portal-url');
  if (scriptTag.getAttribute('data-sonor-api-url')) {
    PORTAL_API_URL = scriptTag.getAttribute('data-sonor-api-url');
  } else if (scriptTag.getAttribute('data-portal-api-url')) {
    PORTAL_API_URL = scriptTag.getAttribute('data-portal-api-url');
  }
  // Never use .netlify/functions — use Sonor API (api.sonor.io) only
  if (PORTAL_API_URL && PORTAL_API_URL.indexOf('.netlify/functions') !== -1) PORTAL_API_URL = 'https://api.sonor.io';

  const WIDGET_ORIGIN = scriptTag.src ? new URL(scriptTag.src).origin : PORTAL_URL;

  // Generate or retrieve visitor/session IDs
  function getVisitorId() {
    let id = localStorage.getItem('engage_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('engage_visitor_id', id);
    }
    return id;
  }

  function getSessionId() {
    let id = sessionStorage.getItem('engage_session_id');
    if (!id) {
      id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('engage_session_id', id);
    }
    return id;
  }

  visitorId = getVisitorId();
  sessionId = getSessionId();

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Darken a hex color by percentage
  function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  // Update FAB to show listening animation
  function setFabListening(isListening) {
    const fab = document.querySelector('.engage-widget-fab');
    if (!fab || fab.classList.contains('open')) return;
    
    const currentLogo = fab.querySelector('.echo-logo-svg');
    if (currentLogo) {
      const newLogo = isListening ? ECHO_LOGO_LISTENING_SVG : ECHO_LOGO_SVG;
      const temp = document.createElement('div');
      temp.innerHTML = newLogo;
      const newSvg = temp.querySelector('svg');
      currentLogo.replaceWith(newSvg);
    }
  }

  // Fetch widget configuration (apiKey identifies project) – Portal API
  async function fetchConfig() {
    try {
      const response = await fetch(`${PORTAL_API_URL}/engage/widget/config`, {
        headers: { 'X-API-Key': apiKey }
      });
      const res = await response.json();
      const data = res?.data;
      if (data?.enabled) {
        config = data;
        initWidget();
      }
    } catch (error) {
      console.error('[Engage] Failed to fetch config:', error);
    }
  }

  // Initialize widget
  function initWidget() {
    if (!config) return;
    
    // Clean up old frequency data
    cleanupFrequencyData();
    
    injectStyles();
    createWidget();
    
    // Fetch and display engage elements (popups, banners, nudges)
    fetchAndDisplayElements();
    
    // Auto-open after delay if configured
    if (config.autoOpenDelay && !sessionStorage.getItem('engage_opened')) {
      setTimeout(() => {
        openWidget();
        sessionStorage.setItem('engage_opened', 'true');
      }, config.autoOpenDelay * 1000);
    }
    
    trackEvent('widget_loaded');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ELEMENTS DISPLAY ENGINE (Popups, Banners, Nudges)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  /**
   * Fetch active elements from Portal API and display them
   */
  async function fetchAndDisplayElements() {
    try {
      const url = new URL(`${PORTAL_API_URL}/engage/widget/elements`);
      url.searchParams.set('url', window.location.pathname);
      url.searchParams.set('visitorId', visitorId);
      url.searchParams.set('deviceType', getDeviceType());
      
      const response = await fetch(url, {
        headers: { 'X-API-Key': apiKey }
      });
      const res = await response.json();
      const elements = res?.data?.elements;
      if (elements && Array.isArray(elements)) {
        activeElements = elements;
        processElements();
      }
    } catch (error) {
      console.error('[Engage] Failed to fetch elements:', error);
    }
  }
  
  /**
   * Process elements and display them based on triggers and frequency caps
   */
  function processElements() {
    activeElements.forEach(element => {
      // Check frequency cap
      if (!shouldShowElement(element)) {
        console.log(`[Engage] Element ${element.id} blocked by frequency cap`);
        return;
      }
      
      const trigger = element.trigger_type || 'time';
      const triggerConfig = element.trigger_config || { delay_seconds: 3 };
      
      switch (trigger) {
        case 'time':
          setTimeout(() => {
            displayElement(element);
          }, (triggerConfig.delay_seconds || 3) * 1000);
          break;
          
        case 'scroll':
          const scrollHandler = () => {
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercent >= (triggerConfig.scroll_percent || 50)) {
              displayElement(element);
              window.removeEventListener('scroll', scrollHandler);
            }
          };
          window.addEventListener('scroll', scrollHandler);
          break;
          
        case 'exit':
          const exitHandler = (e) => {
            if (e.clientY < 10) {
              displayElement(element);
              document.removeEventListener('mouseleave', exitHandler);
            }
          };
          document.addEventListener('mouseleave', exitHandler);
          break;
          
        case 'click':
          // Click triggers are handled by specific CSS selectors
          if (triggerConfig.selector) {
            document.querySelectorAll(triggerConfig.selector).forEach(el => {
              el.addEventListener('click', () => displayElement(element));
            });
          }
          break;
          
        case 'immediate':
        default:
          displayElement(element);
          break;
      }
    });
  }
  
  /**
   * Display an element on the page
   */
  function displayElement(element) {
    // Double-check frequency cap (in case of race conditions)
    if (!shouldShowElement(element)) return;
    
    const elementId = `engage-element-${element.id}`;
    if (document.getElementById(elementId)) return; // Already displayed
    
    // Mark as shown for frequency capping
    markElementShown(element);
    
    // Create element container
    const container = document.createElement('div');
    container.id = elementId;
    container.className = `engage-element engage-${element.element_type} engage-position-${element.position || 'center'}`;
    container.innerHTML = renderElement(element);
    
    document.body.appendChild(container);
    
    // Track impression
    trackElementEvent(element.id, 'impression');
    
    // Apply animation
    requestAnimationFrame(() => {
      container.classList.add('engage-element-visible');
    });
    
    // Attach event handlers
    attachElementHandlers(container, element);
  }
  
  /**
   * Render element HTML based on type
   */
  function renderElement(element) {
    const type = element.element_type;
    
    if (type === 'popup') {
      return renderPopup(element);
    } else if (type === 'banner') {
      return renderBanner(element);
    } else if (type === 'nudge') {
      return renderNudge(element);
    } else if (type === 'toast') {
      return renderToast(element);
    }
    
    return '';
  }
  
  function renderPopup(element) {
    return `
      <div class="engage-popup-overlay" data-element-id="${element.id}">
        <div class="engage-popup-content" style="${getElementStyles(element)}">
          <button class="engage-popup-close" aria-label="Close">&times;</button>
          ${element.image_url ? `<img src="${element.image_url}" alt="" class="engage-popup-image">` : ''}
          ${element.headline ? `<h2 class="engage-popup-headline">${escapeHtml(element.headline)}</h2>` : ''}
          ${element.body ? `<p class="engage-popup-body">${escapeHtml(element.body)}</p>` : ''}
          ${element.cta_text ? `<a href="${element.cta_url || '#'}" class="engage-popup-cta" data-action="${element.cta_action || 'link'}">${escapeHtml(element.cta_text)}</a>` : ''}
        </div>
      </div>
    `;
  }
  
  function renderBanner(element) {
    const position = element.position === 'top' ? 'top' : 'bottom';
    return `
      <div class="engage-banner engage-banner-${position}" style="${getElementStyles(element)}">
        <div class="engage-banner-content">
          ${element.headline ? `<span class="engage-banner-headline">${escapeHtml(element.headline)}</span>` : ''}
          ${element.body ? `<span class="engage-banner-body">${escapeHtml(element.body)}</span>` : ''}
          ${element.cta_text ? `<a href="${element.cta_url || '#'}" class="engage-banner-cta" data-action="${element.cta_action || 'link'}">${escapeHtml(element.cta_text)}</a>` : ''}
        </div>
        <button class="engage-banner-close" aria-label="Close">&times;</button>
      </div>
    `;
  }
  
  function renderNudge(element) {
    const position = element.position || 'bottom-right';
    return `
      <div class="engage-nudge engage-nudge-${position}" style="${getElementStyles(element)}">
        <button class="engage-nudge-close" aria-label="Close">&times;</button>
        ${element.image_url ? `<img src="${element.image_url}" alt="" class="engage-nudge-image">` : ''}
        <div class="engage-nudge-content">
          ${element.headline ? `<h4 class="engage-nudge-headline">${escapeHtml(element.headline)}</h4>` : ''}
          ${element.body ? `<p class="engage-nudge-body">${escapeHtml(element.body)}</p>` : ''}
          ${element.cta_text ? `<a href="${element.cta_url || '#'}" class="engage-nudge-cta" data-action="${element.cta_action || 'link'}">${escapeHtml(element.cta_text)}</a>` : ''}
        </div>
      </div>
    `;
  }
  
  function renderToast(element) {
    return `
      <div class="engage-toast" style="${getElementStyles(element)}">
        ${element.headline ? `<span class="engage-toast-text">${escapeHtml(element.headline)}</span>` : ''}
        ${element.cta_text ? `<a href="${element.cta_url || '#'}" class="engage-toast-cta" data-action="${element.cta_action || 'link'}">${escapeHtml(element.cta_text)}</a>` : ''}
        <button class="engage-toast-close" aria-label="Close">&times;</button>
      </div>
    `;
  }
  
  function getElementStyles(element) {
    const theme = element.theme || {};
    let styles = [];
    
    if (theme.backgroundColor) styles.push(`background-color: ${theme.backgroundColor}`);
    if (theme.textColor) styles.push(`color: ${theme.textColor}`);
    if (theme.borderRadius) styles.push(`border-radius: ${theme.borderRadius}px`);
    
    return styles.join('; ');
  }
  
  function attachElementHandlers(container, element) {
    // Close button
    const closeBtn = container.querySelector('.engage-popup-close, .engage-banner-close, .engage-nudge-close, .engage-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        trackElementEvent(element.id, 'close');
        removeElement(element.id);
      });
    }
    
    // Overlay click (for popups)
    const overlay = container.querySelector('.engage-popup-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          trackElementEvent(element.id, 'close');
          removeElement(element.id);
        }
      });
    }
    
    // CTA click
    const cta = container.querySelector('.engage-popup-cta, .engage-banner-cta, .engage-nudge-cta, .engage-toast-cta');
    if (cta) {
      cta.addEventListener('click', (e) => {
        trackElementEvent(element.id, 'click');
        
        const action = cta.getAttribute('data-action');
        if (action === 'close' || action === 'dismiss') {
          e.preventDefault();
          removeElement(element.id);
        } else if (action === 'open_chat') {
          e.preventDefault();
          removeElement(element.id);
          openWidget();
        }
        // For 'link' action, let the default click behavior work
      });
    }
    
    // Auto-dismiss for toasts
    if (element.element_type === 'toast') {
      setTimeout(() => removeElement(element.id), 5000);
    }
  }
  
  function removeElement(elementId) {
    const container = document.getElementById(`engage-element-${elementId}`);
    if (container) {
      container.classList.remove('engage-element-visible');
      container.classList.add('engage-element-hiding');
      setTimeout(() => container.remove(), 300);
    }
  }
  
  function trackElementEvent(elementId, eventType) {
    try {
      fetch(`${PORTAL_API_URL}/engage/widget/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          elementId,
          eventType,
          pageUrl: window.location.href,
          visitorId,
          sessionId: sessionId || '',
          deviceType: getDeviceType()
        })
      });
    } catch (error) {
      // Silently fail
    }
  }

  // Inject CSS styles
  function injectStyles() {
    const accent = config.theme?.accent || '#4bbf39';
    const accentDark = config.theme?.accentDark || darkenColor(accent, 15);
    const textOnAccent = config.theme?.textOnAccent || '#ffffff';
    const fabStyle = config.theme?.fabStyle || 'solid'; // 'solid' or 'gradient'
    const fabGradient = config.theme?.fabGradient || `linear-gradient(135deg, ${accent} 0%, ${accentDark} 100%)`;
    
    const styles = `
      /* ═══════════════════════════════════════════════════════════════════════════════
       * ECHO CHAT WIDGET - Self-contained styles for tenant websites
       * Powered by Signal AI
       * ═══════════════════════════════════════════════════════════════════════════════ */
      
      /* FAB Button */
      .engage-widget-fab {
        position: fixed;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 20px;
        bottom: 20px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${fabStyle === 'gradient' ? fabGradient : accent};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), 0 0 0 0 ${accent}40;
        z-index: 999998;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        color: ${textOnAccent};
        overflow: visible;
      }
      .engage-widget-fab:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 28px rgba(0, 0, 0, 0.25), 0 0 0 8px ${accent}20;
      }
      .engage-widget-fab::before {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        background: ${accent};
        opacity: 0;
        z-index: -1;
        animation: engage-fab-pulse 2s infinite;
      }
      @keyframes engage-fab-pulse {
        0%, 100% { transform: scale(1); opacity: 0; }
        50% { transform: scale(1.15); opacity: 0.2; }
      }
      .engage-widget-fab .echo-logo-svg {
        width: 36px;
        height: 36px;
        color: ${textOnAccent};
      }
      .engage-widget-fab .echo-logo-svg .echo-bar,
      .engage-widget-fab .echo-logo-svg .echo-wave {
        transform-origin: center;
      }
      .engage-widget-fab svg.close-icon {
        width: 28px;
        height: 28px;
        fill: ${textOnAccent};
      }
      .engage-widget-fab.open .echo-logo-svg {
        display: none;
      }
      .engage-widget-fab:not(.open) svg.close-icon {
        display: none;
      }
      
      /* Widget Container */
      .engage-widget-container {
        position: fixed;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 20px;
        bottom: 90px;
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 520px;
        max-height: calc(100vh - 120px);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .engage-widget-container.open {
        display: flex;
        animation: engage-slide-up 0.3s ease-out;
      }
      @keyframes engage-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Header with Echo branding */
      .engage-widget-header {
        background: ${fabStyle === 'gradient' ? fabGradient : accent};
        color: ${textOnAccent};
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .engage-widget-header-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .engage-widget-header-avatar .echo-logo-svg {
        width: 28px;
        height: 28px;
        color: ${textOnAccent};
      }
      .engage-widget-header-text {
        flex: 1;
        min-width: 0;
      }
      .engage-widget-header-text h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .engage-widget-header-text h3 .echo-name {
        font-weight: 700;
      }
      .engage-widget-header-text p {
        margin: 2px 0 0;
        font-size: 12px;
        opacity: 0.9;
      }
      .engage-widget-header-close {
        background: rgba(255,255,255,0.2);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
        flex-shrink: 0;
      }
      .engage-widget-header-close:hover {
        background: rgba(255,255,255,0.3);
      }
      .engage-widget-header-close svg {
        width: 18px;
        height: 18px;
        fill: ${textOnAccent};
      }
      .engage-widget-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f8f9fa;
      }
      .engage-widget-form {
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .engage-widget-form h4 {
        margin: 0 0 8px;
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
      }
      .engage-widget-form p {
        margin: 0 0 16px;
        font-size: 14px;
        color: #666;
      }
      .engage-widget-field {
        margin-bottom: 12px;
      }
      .engage-widget-field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #444;
        margin-bottom: 4px;
      }
      .engage-widget-field label span.required {
        color: #e74c3c;
      }
      .engage-widget-field input,
      .engage-widget-field textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .engage-widget-field input:focus,
      .engage-widget-field textarea:focus {
        outline: none;
        border-color: ${accent};
      }
      .engage-widget-field textarea {
        resize: vertical;
        min-height: 80px;
      }
      .engage-widget-submit {
        width: 100%;
        padding: 12px;
        background: ${accent};
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
        margin-top: 8px;
      }
      .engage-widget-submit:hover {
        opacity: 0.9;
      }
      .engage-widget-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .engage-widget-messages {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .engage-widget-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.4;
      }
      .engage-widget-message.visitor {
        align-self: flex-end;
        background: ${accent};
        color: white;
        border-bottom-right-radius: 4px;
      }
      .engage-widget-message.agent,
      .engage-widget-message.ai {
        align-self: flex-start;
        background: white;
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .engage-widget-message.system {
        align-self: center;
        background: transparent;
        color: #888;
        font-size: 13px;
        text-align: center;
        padding: 8px;
      }
      .engage-widget-footer {
        padding: 12px;
        background: white;
        border-top: 1px solid #eee;
      }
      .engage-widget-input-container {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      .engage-widget-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 14px;
        resize: none;
        min-height: 40px;
        max-height: 120px;
        overflow-y: auto;
      }
      .engage-widget-input:focus {
        outline: none;
        border-color: ${accent};
      }
      .engage-widget-send {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${accent};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .engage-widget-send svg {
        width: 18px;
        height: 18px;
        fill: white;
      }
      .engage-widget-powered {
        text-align: center;
        padding: 8px 12px;
        font-size: 11px;
        color: #888;
        background: #fafafa;
        border-top: 1px solid #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .engage-widget-powered .echo-mini-logo {
        width: 14px;
        height: 14px;
        color: ${accent};
      }
      .engage-widget-powered a {
        color: #666;
        text-decoration: none;
        font-weight: 500;
      }
      .engage-widget-powered a:hover {
        text-decoration: underline;
        color: ${accent};
      }
      .engage-widget-powered .signal-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        background: linear-gradient(90deg, ${accent}15, ${accent}08);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        color: ${accent};
        font-weight: 600;
      }
      /* Typing indicator */
      .engage-widget-message.typing {
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .engage-widget-message.typing span:not(.engage-typing-text) {
        width: 8px;
        height: 8px;
        background: #888;
        border-radius: 50%;
        animation: typing-bounce 1.4s infinite ease-in-out both;
      }
      .engage-widget-message.typing span:nth-child(1) { animation-delay: -0.32s; }
      .engage-widget-message.typing span:nth-child(2) { animation-delay: -0.16s; }
      .engage-widget-message.typing span:nth-child(3) { animation-delay: 0s; }
      .engage-widget-message.typing .engage-typing-text {
        margin-left: 8px;
        font-size: 12px;
        color: #666;
        background: transparent;
        animation: none;
      }
      @keyframes typing-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
      /* Connect to agent button */
      .engage-connect-agent {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 10px 16px;
        margin-top: 12px;
        background: transparent;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 13px;
        color: #666;
        cursor: pointer;
        transition: all 0.2s;
      }
      .engage-connect-agent:hover {
        background: #f5f5f5;
        border-color: #bbb;
        color: #333;
      }
      .engage-connect-agent svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
      /* Quick action / option chips – ensure selected/focus never white-on-white */
      .engage-quick-action {
        padding: 8px 14px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, color 0.2s, border-color 0.2s;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(55, 65, 81, 0.9);
        color: #ffffff;
      }
      .engage-quick-action:hover {
        background: #4b5563;
        color: #ffffff;
      }
      /* Selected/focus: always dark text on light bg so we never get white-on-white */
      .engage-quick-action:focus,
      .engage-quick-action:active,
      .engage-quick-action.active {
        outline: none;
        background: #e5e7eb;
        color: #1a1a1a;
        border-color: #d1d5db;
      }
      .engage-quick-action svg {
        fill: currentColor;
      }
      /* Handoff form */
      .engage-widget-handoff-form {
        background: white;
        border-radius: 12px;
        padding: 16px;
        margin-top: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .engage-widget-handoff-form .engage-widget-field {
        margin-bottom: 10px;
      }
      .engage-widget-handoff-form input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .engage-widget-handoff-form input:focus {
        outline: none;
        border-color: ${accent};
      }
      
      /* ═══════════════════════════════════════════════════════════════════════════════
       * ENGAGE ELEMENTS - Popups, Banners, Nudges, Toasts
       * ═══════════════════════════════════════════════════════════════════════════════ */
      
      /* Base element styles */
      .engage-element {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 999990;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      .engage-element-visible {
        opacity: 1;
      }
      .engage-element-hiding {
        opacity: 0;
        pointer-events: none;
      }
      
      /* Popup styles */
      .engage-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        z-index: 999991;
      }
      .engage-popup-content {
        position: relative;
        background: #ffffff;
        border-radius: 12px;
        max-width: 400px;
        width: 100%;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: engage-popup-in 0.3s ease;
      }
      @keyframes engage-popup-in {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .engage-popup-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #888;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.2s;
      }
      .engage-popup-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      .engage-popup-image {
        width: 100%;
        max-height: 200px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 16px;
      }
      .engage-popup-headline {
        margin: 0 0 12px;
        font-size: 22px;
        font-weight: 600;
        color: #111;
      }
      .engage-popup-body {
        margin: 0 0 20px;
        font-size: 15px;
        color: #555;
        line-height: 1.5;
      }
      .engage-popup-cta {
        display: inline-block;
        padding: 12px 24px;
        background: ${accent};
        color: ${textOnAccent};
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .engage-popup-cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px ${accent}40;
      }
      
      /* Banner styles */
      .engage-banner {
        position: fixed;
        left: 0;
        right: 0;
        background: ${accent};
        color: ${textOnAccent};
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 999989;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
      }
      .engage-banner-top {
        top: 0;
        animation: engage-banner-slide-down 0.3s ease;
      }
      .engage-banner-bottom {
        bottom: 0;
        animation: engage-banner-slide-up 0.3s ease;
      }
      @keyframes engage-banner-slide-down {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      @keyframes engage-banner-slide-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .engage-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .engage-banner-headline {
        font-weight: 600;
        font-size: 15px;
      }
      .engage-banner-body {
        font-size: 14px;
        opacity: 0.9;
      }
      .engage-banner-cta {
        padding: 8px 16px;
        background: rgba(255, 255, 255, 0.2);
        color: inherit;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        transition: background 0.2s;
      }
      .engage-banner-cta:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .engage-banner-close {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        padding: 4px;
      }
      .engage-banner-close:hover {
        opacity: 1;
      }
      
      /* Nudge styles */
      .engage-nudge {
        position: fixed;
        background: #ffffff;
        border-radius: 12px;
        padding: 16px;
        max-width: 320px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        z-index: 999988;
        animation: engage-nudge-in 0.3s ease;
      }
      @keyframes engage-nudge-in {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .engage-nudge-bottom-right {
        bottom: 90px;
        right: 20px;
      }
      .engage-nudge-bottom-left {
        bottom: 90px;
        left: 20px;
      }
      .engage-nudge-top-right {
        top: 20px;
        right: 20px;
      }
      .engage-nudge-top-left {
        top: 20px;
        left: 20px;
      }
      .engage-nudge-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #888;
        padding: 4px;
      }
      .engage-nudge-close:hover {
        color: #333;
      }
      .engage-nudge-image {
        width: 100%;
        max-height: 120px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .engage-nudge-content {
        padding-right: 20px;
      }
      .engage-nudge-headline {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
        color: #111;
      }
      .engage-nudge-body {
        margin: 0 0 12px;
        font-size: 14px;
        color: #555;
        line-height: 1.4;
      }
      .engage-nudge-cta {
        display: inline-block;
        padding: 8px 16px;
        background: ${accent};
        color: ${textOnAccent};
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        transition: background 0.2s;
      }
      .engage-nudge-cta:hover {
        filter: brightness(1.1);
      }
      
      /* Toast styles */
      .engage-toast {
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 999987;
        animation: engage-toast-in 0.3s ease;
      }
      @keyframes engage-toast-in {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
      .engage-toast-text {
        font-size: 14px;
      }
      .engage-toast-cta {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.2);
        color: inherit;
        text-decoration: none;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 500;
      }
      .engage-toast-cta:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .engage-toast-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        padding: 0 4px;
      }
      .engage-toast-close:hover {
        opacity: 1;
      }
      
      @media (max-width: 480px) {
        .engage-widget-container {
          width: calc(100vw - 20px);
          ${config.position === 'bottom-left' ? 'left' : 'right'}: 10px;
          bottom: 80px;
          height: calc(100vh - 100px);
          max-height: 600px;
          border-radius: 12px;
        }
        .engage-widget-fab {
          ${config.position === 'bottom-left' ? 'left' : 'right'}: 10px;
          bottom: 10px;
          width: 56px;
          height: 56px;
        }
      }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Create widget DOM
  function createWidget() {
    // FAB button with animated Echo logo
    const fab = document.createElement('button');
    fab.className = 'engage-widget-fab';
    fab.innerHTML = `
      ${ECHO_LOGO_SVG}
      <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
    fab.onclick = toggleWidget;
    document.body.appendChild(fab);
    
    // Widget container with Echo branding
    const container = document.createElement('div');
    container.className = 'engage-widget-container';
    container.id = 'engage-widget';
    
    // Echo mini logo for header
    const echoMiniLogo = `<svg viewBox="0 0 484.21 482.45" class="echo-logo-svg" style="width: 24px; height: 24px;">
      <g fill="currentColor">
        <path d="M484.21,242.1c0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-5.38s0-.02,0-.03V90.55c0-9.34,7.64-16.98,16.98-16.98s16.98,7.64,16.98,16.98v273.08s0,.02,0,.03v57.02c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57Z"/>
        <path d="M204.49,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z"/>
        <path d="M313.68,350.68v-212.7c0-9.34-7.64-16.98-16.98-16.98h0c-9.34,0-16.98,7.64-16.98,16.98v212.7c0,9.34,7.64,16.98,16.98,16.98h0c9.34,0,16.98-7.64,16.98-16.98Z"/>
      </g>
    </svg>`;
    
    container.innerHTML = `
      <div class="engage-widget-header">
        <div class="engage-widget-header-avatar">
          ${echoMiniLogo}
        </div>
        <div class="engage-widget-header-text">
          <h3><span class="echo-name">Echo</span></h3>
          <p>${config.projectName ? `${config.projectName} Assistant` : 'AI Assistant'}</p>
        </div>
        <button class="engage-widget-header-close" onclick="document.querySelector('.engage-widget-fab').click()">
          <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="engage-widget-body" id="engage-body">
        ${renderFormOrChat()}
      </div>
      <div class="engage-widget-powered">
        <span class="signal-badge">
          <svg viewBox="0 0 484.21 482.45" class="echo-mini-logo" style="width: 12px; height: 12px;">
            <g fill="currentColor">
              <path d="M484.21,242.1c0,116.93-82.77,215.11-193.12,237.15-8.5,1.7-18.93,2.74-29.05,3.2-.63.03-.91-.79-.39-1.15,4.47-3.13,11.01-8.54,15.99-16.11,4.08-6.21,6.24-12.12,7.42-16.45.06-.22.24-.39.46-.44,97.61-22.45,166.95-108.92,166.95-206.2,0-129.41-116.85-231.53-250.79-206.61C117.63,51.14,51.44,117.13,35.6,201.14c-18.34,97.26,30.34,185.56,107.86,226.8,6.63,3.62,14.61,7.41,23.88,10.76,9.6,3.46,18.34,6.39,26.05,7.12,2.11.2,13.32-.21,22.39-9.25,5.74-5.72,9.3-13.62,9.33-22.35h0v-45.17s0,0,0,0v-5.38s0-.02,0-.03V90.55c0-9.34,7.64-16.98,16.98-16.98s16.98,7.64,16.98,16.98v273.08s0,.02,0,.03v57.02c0,32.62-26.46,59.62-59.08,59.02-5.34-.1-10.5-.93-15.39-2.37,0,0,0,0,0,0C61.86,447.43-24.26,323.97,6.14,186.74,26.3,95.74,98.33,24.71,189.55,5.53c156.66-32.94,294.66,85.7,294.66,236.57Z"/>
            </g>
          </svg>
          Signal AI
        </span>
        <span>•</span>
        <a href="https://sonor.io" target="_blank" rel="noopener">Sonor</a>
      </div>
    `;
    
    document.body.appendChild(container);
  }

  // Render form or chat based on mode and session state
  function renderFormOrChat() {
    const existingSession = sessionStorage.getItem('engage_chat_session');
    
    if (existingSession) {
      return renderChatView();
    }
    
    // Check business hours - if outside hours, show appropriate offline behavior
    if (config.isWithinBusinessHours === false) {
      const offlineBehavior = config.offlineBehavior || 'show_form';
      
      if (offlineBehavior === 'hide_handoff') {
        // Only show AI, no handoff option will be available
        return renderAIWelcome();
      } else if (offlineBehavior === 'ai_only') {
        // AI with message that human support is unavailable
        return renderAIWelcomeOffline();
      } else {
        // 'show_form' - show contact form instead of live chat
        return renderOfflineForm();
      }
    }
    
    // Live chat only mode - show form immediately
    if (config.chatMode === 'live_only') {
      return renderForm();
    }
    
    // AI mode - show initial message + quick actions
    return renderAIWelcome();
  }

  // Render offline message view (outside business hours)
  function renderOfflineForm() {
    const requiredFields = config.formRequiredFields || ['name', 'email'];
    const optionalFields = config.formOptionalFields || [];
    const allFields = [...requiredFields, ...optionalFields];
    
    let fieldsHtml = '';
    
    if (allFields.includes('name')) {
      const isRequired = requiredFields.includes('name');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Name${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="name" ${isRequired ? 'required' : ''} placeholder="Your name">
        </div>
      `;
    }
    
    if (allFields.includes('email')) {
      const isRequired = requiredFields.includes('email');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Email${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="email" name="email" ${isRequired ? 'required' : ''} placeholder="your@email.com">
        </div>
      `;
    }
    
    if (allFields.includes('phone')) {
      const isRequired = requiredFields.includes('phone');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Phone${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="tel" name="phone" ${isRequired ? 'required' : ''} placeholder="(555) 123-4567">
        </div>
      `;
    }
    
    fieldsHtml += `
      <div class="engage-widget-field">
        <label>Message <span class="required">*</span></label>
        <textarea name="message" required placeholder="How can we help?"></textarea>
      </div>
    `;
    
    return `
      <div class="engage-widget-form">
        <div class="engage-widget-message system" style="margin-bottom: 16px; background: #fff3cd; color: #856404; border-radius: 8px; padding: 12px;">
          We're currently offline. Leave us a message and we'll get back to you soon!
        </div>
        <form id="engage-form">
          ${fieldsHtml}
          <button type="submit" class="engage-widget-submit">${config.formSubmitText || 'Send Message'}</button>
        </form>
      </div>
    `;
  }

  // Render AI welcome with offline notice
  function renderAIWelcomeOffline() {
    const quickActions = config.quickActions || [];
    let actionsHtml = '';
    
    if (quickActions.length > 0) {
      actionsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">';
      quickActions.forEach(action => {
        actionsHtml += `<button class="engage-quick-action" data-action="${action.action || action.label}">${action.label}</button>`;
      });
      actionsHtml += '</div>';
    }
    
    return `
      <div class="engage-widget-messages">
        <div class="engage-widget-message ai">
          ${config.initialMessage || "Hi! 👋 How can I help you today?"}
        </div>
        <div class="engage-widget-message system" style="background: #e8f4fd; color: #0d6efd; font-size: 12px;">
          Our team is currently offline. I'm an AI assistant and can help answer questions!
        </div>
      </div>
      ${actionsHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Render the contact form
  function renderForm() {
    const requiredFields = config.formRequiredFields || ['name', 'email'];
    const optionalFields = config.formOptionalFields || [];
    const allFields = [...requiredFields, ...optionalFields];
    
    let fieldsHtml = '';
    
    if (allFields.includes('name')) {
      const isRequired = requiredFields.includes('name');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Name${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="name" ${isRequired ? 'required' : ''} placeholder="Your name">
        </div>
      `;
    }
    
    if (allFields.includes('email')) {
      const isRequired = requiredFields.includes('email');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Email${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="email" name="email" ${isRequired ? 'required' : ''} placeholder="you@example.com">
        </div>
      `;
    }
    
    if (allFields.includes('phone')) {
      const isRequired = requiredFields.includes('phone');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Phone${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="tel" name="phone" ${isRequired ? 'required' : ''} placeholder="(555) 123-4567">
        </div>
      `;
    }
    
    if (allFields.includes('company')) {
      const isRequired = requiredFields.includes('company');
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>Company${isRequired ? ' <span class="required">*</span>' : ''}</label>
          <input type="text" name="company" ${isRequired ? 'required' : ''} placeholder="Company name">
        </div>
      `;
    }
    
    if (config.formShowMessage) {
      fieldsHtml += `
        <div class="engage-widget-field">
          <label>How can we help?</label>
          <textarea name="message" placeholder="Tell us what you need..."></textarea>
        </div>
      `;
    }
    
    return `
      <form class="engage-widget-form" id="engage-form" onsubmit="return false;">
        <h4>${config.formHeading || 'Chat with our team'}</h4>
        <p>${config.formDescription || 'Leave your info and we\'ll respond shortly.'}</p>
        ${fieldsHtml}
        <button type="submit" class="engage-widget-submit">${config.formSubmitText || 'Start Chat'}</button>
      </form>
    `;
  }

  // Render AI welcome view
  function renderAIWelcome() {
    const quickActions = config.quickActions || [];
    let actionsHtml = '';
    
    if (quickActions.length > 0) {
      actionsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">';
      quickActions.forEach(action => {
        actionsHtml += `<button class="engage-quick-action" data-action="${action.action || action.label}">${action.label}</button>`;
      });
      actionsHtml += '</div>';
    }
    
    // Show connect to agent button if handoff is enabled
    const connectAgentHtml = config.handoffEnabled ? `
      <button class="engage-connect-agent" id="engage-connect-agent">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        Talk to a person
      </button>
    ` : '';
    
    return `
      <div class="engage-widget-messages" id="engage-messages">
        <div class="engage-widget-message ai">
          ${config.initialMessage || "Hi! 👋 How can I help you today?"}
        </div>
      </div>
      ${actionsHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        ${connectAgentHtml}
      </div>
    `;
  }

  // Render chat view
  function renderChatView() {
    let messagesHtml = '<div class="engage-widget-messages" id="engage-messages">';
    
    messages.forEach(msg => {
      messagesHtml += `<div class="engage-widget-message ${msg.role}">${escapeHtml(msg.content)}</div>`;
    });
    
    messagesHtml += '</div>';
    
    // Only show connect button if in AI mode (no live session) and handoff enabled
    const chatSessionId = sessionStorage.getItem('engage_chat_session');
    const isAIMode = !chatSessionId && (config.chatMode === 'ai' || config.chatMode === 'ai_first');
    const connectAgentHtml = (config.handoffEnabled && isAIMode) ? `
      <button class="engage-connect-agent" id="engage-connect-agent">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        Talk to a person
      </button>
    ` : '';
    
    return `
      ${messagesHtml}
      <div class="engage-widget-footer" style="margin-top: auto;">
        <div class="engage-widget-input-container">
          <textarea class="engage-widget-input" id="engage-input" placeholder="Type a message..." rows="1"></textarea>
          <button class="engage-widget-send" id="engage-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        ${connectAgentHtml}
      </div>
    `;
  }

  // Toggle widget open/closed
  function toggleWidget() {
    isOpen = !isOpen;
    const container = document.getElementById('engage-widget');
    const fab = document.querySelector('.engage-widget-fab');
    
    if (isOpen) {
      container.classList.add('open');
      fab.classList.add('open');
      trackEvent('widget_opened');
      attachFormHandler();
      attachChatHandlers();
      startPolling();
    } else {
      container.classList.remove('open');
      fab.classList.remove('open');
      trackEvent('widget_closed');
      stopPolling();
    }
  }

  function openWidget() {
    if (!isOpen) toggleWidget();
  }

  // Attach form submit handler
  function attachFormHandler() {
    const form = document.getElementById('engage-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {
          visitorName: formData.get('name'),
          visitorEmail: formData.get('email'),
          visitorPhone: formData.get('phone'),
          initialMessage: formData.get('message')
        };
        
        const submitBtn = form.querySelector('.engage-widget-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Starting...';
        
        try {
          await createSession(data);
          trackEvent('form_submitted');
          showChatView();
        } catch (error) {
          console.error('[Engage] Form submit error:', error);
          submitBtn.disabled = false;
          submitBtn.textContent = config.formSubmitText || 'Start Chat';
        }
      };
    }
  }

  // Attach chat input handlers
  let visitorTypingTimeout = null;
  
  function attachChatHandlers() {
    const input = document.getElementById('engage-input');
    const sendBtn = document.getElementById('engage-send');
    const connectBtn = document.getElementById('engage-connect-agent');
    
    if (input && sendBtn) {
      sendBtn.onclick = () => sendMessage();
      input.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };
      
      // Auto-resize textarea and emit typing status
      input.oninput = () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        
        // Emit visitor typing
        sendVisitorTyping(true);
        
        // Stop typing after 2 seconds of no input
        if (visitorTypingTimeout) clearTimeout(visitorTypingTimeout);
        visitorTypingTimeout = setTimeout(() => {
          sendVisitorTyping(false);
        }, 2000);
      };
    }
    
    // Connect to agent button
    if (connectBtn) {
      connectBtn.onclick = () => {
        trackEvent('connect_agent_clicked');
        showHandoffForm('user_requested');
      };
    }
    
    // Quick action buttons
    document.querySelectorAll('.engage-quick-action').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action || btn.textContent;
        const input = document.getElementById('engage-input');
        if (input) {
          input.value = action;
          sendMessage();
        }
      };
    });
  }

  // Create chat session – Portal API
  async function createSession(visitorData) {
    const response = await fetch(`${PORTAL_API_URL}/engage/widget/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        visitorId,
        visitorName: visitorData.visitorName,
        visitorEmail: visitorData.visitorEmail,
        visitorPhone: visitorData.visitorPhone,
        sourceUrl: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
        chatMode: visitorData.chatMode,
        aiSummary: visitorData.aiSummary,
        aiConversationId: visitorData.aiConversationId
      })
    });
    
    const res = await response.json();
    const session = res?.data?.session;
    if (!session?.id) throw new Error(res?.message || 'Failed to create session');
    sessionStorage.setItem('engage_chat_session', session.id);
    
    if (visitorData.initialMessage) {
      messages.push({
        role: 'visitor',
        content: visitorData.initialMessage
      });
      // Send initial message to Portal for live chat
      await sendLiveMessage(session.id, visitorData.initialMessage);
    }
    
    // Add system message
    messages.push({
      role: 'system',
      content: 'You\'re connected! We\'ll respond shortly.'
    });
    
    return { session };
  }

  // Send a message
  async function sendMessage() {
    const input = document.getElementById('engage-input');
    const content = input.value.trim();
    
    if (!content || isWaitingForAI) return;
    
    input.value = '';
    input.style.height = 'auto';
    
    // Add message to UI immediately
    messages.push({ role: 'visitor', content });
    aiConversationHistory.push({ role: 'user', content });
    updateMessagesUI();
    
    // Check if in AI mode (no session yet, or chatMode is 'ai')
    const chatSessionId = sessionStorage.getItem('engage_chat_session');
    const isAIMode = config.chatMode === 'ai' || config.chatMode === 'ai_first';
    
    if (isAIMode && !chatSessionId) {
      // AI mode - send to Signal for AI response
      await sendAIMessage(content);
    } else if (chatSessionId) {
      // Live chat mode with existing session - send to human agent
      await sendLiveMessage(chatSessionId, content);
    }
  }

  // Ensure Signal Echo socket is connected (auth: UPTRADE_API_KEY + visitorId)
  function ensureEchoSocket(callback) {
    if (echoSocket && echoSocket.connected) {
      callback();
      return;
    }
    if (!window.io) {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => connectEchoSocket(callback);
      document.head.appendChild(script);
    } else {
      connectEchoSocket(callback);
    }
  }

  function connectEchoSocket(onReady) {
    if (echoSocket) {
      if (echoSocket.connected) onReady();
      else echoSocket.once('connect', onReady);
      return;
    }
    echoSocket = window.io(SIGNAL_URL + '/echo-public', {
      auth: { apiKey: apiKey, visitorId: visitorId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    echoSocket.on('connect', () => { if (onReady) onReady(); });
    echoSocket.on('connect_error', (err) => console.error('[Engage] Echo socket error:', err.message));
  }

  // Send message to AI via Signal Echo socket (echo:message / echo:token / echo:complete)
  async function sendAIMessage(content) {
    isWaitingForAI = true;
    showTypingIndicator();
    setFabListening(true);
    
    try {
      await new Promise(function(resolve) {
        ensureEchoSocket(resolve);
      });

      const requestId = 'msg_' + Date.now();
      let fullResponse = '';
      const aiMessageIndex = messages.length;
      messages.push({ role: 'ai', content: '' });
      updateMessagesUI();

      let formShow = null;
      await new Promise(function(resolve, reject) {
        const onToken = function(data) {
          if (data.requestId === requestId && data.content) {
            fullResponse += data.content;
            messages[aiMessageIndex].content = fullResponse;
            updateMessagesUI();
          }
        };
        const onComplete = function(data) {
          if (data.requestId === requestId) {
            echoSocket.off('echo:token', onToken);
            echoSocket.off('echo:complete', onComplete);
            echoSocket.off('echo:error', onErr);
            echoSocket.off('echo:form:show', onFormShow);
            echoSocket.off('echo:memory:updated', onMemoryUpdated);
            resolve();
          }
        };
        const onErr = function(data) {
          if (data.requestId === requestId) {
            echoSocket.off('echo:token', onToken);
            echoSocket.off('echo:complete', onComplete);
            echoSocket.off('echo:error', onErr);
            echoSocket.off('echo:form:show', onFormShow);
            echoSocket.off('echo:memory:updated', onMemoryUpdated);
            reject(new Error(data.message || 'Echo error'));
          }
        };
        const onFormShow = function(data) {
          if (data.requestId === requestId && data.formSlug && !formShow) {
            formShow = { formSlug: data.formSlug, prefill: data.prefill || {} };
          }
        };
        const onMemoryUpdated = function(data) {
          if (data.requestId === requestId && data.updates) {
            try {
              const key = 'engage_visitor_memory';
              const existing = JSON.parse(localStorage.getItem(key) || '{}');
              localStorage.setItem(key, JSON.stringify({ ...existing, ...data.updates }));
            } catch (e) { /* ignore */ }
          }
        };
        echoSocket.on('echo:token', onToken);
        echoSocket.on('echo:complete', onComplete);
        echoSocket.on('echo:error', onErr);
        echoSocket.on('echo:form:show', onFormShow);
        echoSocket.on('echo:memory:updated', onMemoryUpdated);
        echoSocket.emit('echo:message', {
          requestId: requestId,
          message: content,
          pageUrl: window.location.pathname || window.location.href
        });
      });
      if (formShow) {
        messages.push({ role: 'form', formSlug: formShow.formSlug, prefill: formShow.prefill });
        updateMessagesUI();
      }

      hideTypingIndicator();
      if (fullResponse) aiConversationHistory.push({ role: 'assistant', content: fullResponse });
      trackEvent('ai_message_sent');
    } catch (error) {
      console.error('[Engage] AI message error:', error);
      hideTypingIndicator();
      messages.push({ role: 'system', content: 'Sorry, I had trouble processing that. Please try again.' });
      updateMessagesUI();
    } finally {
      isWaitingForAI = false;
      setFabListening(false);
    }
  }

  // Request contextual nudge via echo:nudge (returns via echo:nudge:result)
  async function requestNudge(opts) {
    if (!echoSocket || !echoSocket.connected) {
      await new Promise(function(r) { ensureEchoSocket(r); });
    }
    return new Promise(function(resolve) {
      const requestId = 'nudge_' + Date.now();
      const handler = function(data) {
        if (data.requestId === requestId) {
          echoSocket.off('echo:nudge:result', handler);
          resolve(data.error ? null : { title: data.title, message: data.message, cta: data.cta, action: data.action });
        }
      };
      echoSocket.on('echo:nudge:result', handler);
      echoSocket.emit('echo:nudge', {
        requestId: requestId,
        pageUrl: opts?.pageUrl || (window.location.pathname || window.location.href),
        timeOnPage: opts?.timeOnPage,
        browsingHistory: opts?.browsingHistory,
        visitorMemory: opts?.visitorMemory
      });
    });
  }

  // Parse SSE events from response text
  function parseSSEEvents(text) {
    const events = [];
    const lines = text.split('\n');
    let currentEvent = null;
    
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = { type: line.slice(7).trim() };
      } else if (line.startsWith('data: ') && currentEvent) {
        try {
          currentEvent.data = JSON.parse(line.slice(6));
          events.push(currentEvent);
        } catch (e) {
          console.warn('[Engage] Failed to parse SSE data:', line);
        }
        currentEvent = null;
      }
    }
    
    return events;
  }

  // Send message to live agent – Portal API
  async function sendLiveMessage(chatSessionId, content) {
    try {
      await fetch(`${PORTAL_API_URL}/engage/widget/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          sessionId: chatSessionId,
          visitorId,
          content
        })
      });
      
      trackEvent('message_sent');
    } catch (error) {
      console.error('[Engage] Send message error:', error);
    }
  }

  // Show typing indicator
  function showTypingIndicator() {
    const messagesContainer = document.getElementById('engage-messages');
    if (!messagesContainer) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'engage-typing';
    indicator.className = 'engage-widget-message ai typing';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Hide typing indicator
  function hideTypingIndicator() {
    const indicator = document.getElementById('engage-typing');
    if (indicator) indicator.remove();
  }

  // Handle AI-triggered handoff to human
  async function handleAIHandoff(reason) {
    messages.push({
      role: 'system',
      content: 'I\'m connecting you with a team member who can help further.'
    });
    updateMessagesUI();
    
    // Show form to collect contact info for handoff
    showHandoffForm(reason);
  }

  // Request handoff to human agent – Portal API
  async function requestHandoff(visitorData = {}) {
    const signalConversation = sessionStorage.getItem('engage_signal_conversation');
    
    try {
      const response = await fetch(`${PORTAL_API_URL}/engage/widget/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          visitorId,
          visitorName: visitorData.visitorName,
          visitorEmail: visitorData.visitorEmail,
          visitorPhone: visitorData.visitorPhone,
          sourceUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          deviceType: getDeviceType(),
          chatMode: 'handoff',
          aiConversationId: signalConversation,
          aiSummary: summarizeConversation()
        })
      });
      
      const res = await response.json();
      const session = res?.data?.session;
      if (!session?.id) throw new Error(res?.message || 'Failed to create handoff session');
      sessionStorage.setItem('engage_chat_session', session.id);
      
      // Subscribe to realtime updates for this session
      subscribeToSession(session.id);
      
      messages.push({
        role: 'system',
        content: 'You\'re connected! A team member will respond shortly.'
      });
      updateMessagesUI();
      
      // Start polling as fallback
      startPolling();
      
      trackEvent('handoff_requested', { from: 'ai' });
    } catch (error) {
      console.error('[Engage] Handoff error:', error);
      messages.push({
        role: 'system',
        content: 'Sorry, we couldn\'t connect you right now. Please try again or email us directly.'
      });
      updateMessagesUI();
    }
  }

  // Summarize AI conversation for handoff
  function summarizeConversation() {
    if (aiConversationHistory.length === 0) return 'No prior AI conversation';
    
    const userMessages = aiConversationHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .slice(-5)
      .join(' | ');
    
    return `Visitor asked about: ${userMessages.slice(0, 500)}`;
  }

  // Show handoff form to collect contact info
  function showHandoffForm(reason) {
    const body = document.getElementById('engage-body');
    body.innerHTML = `
      <div class="engage-widget-messages" id="engage-messages">
        ${messages.map(msg => `<div class="engage-widget-message ${msg.role}">${escapeHtml(msg.content)}</div>`).join('')}
      </div>
      <form class="engage-widget-handoff-form" id="engage-handoff-form" onsubmit="return false;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #666;">Enter your details to connect with our team:</p>
        <div class="engage-widget-field">
          <input type="text" name="name" required placeholder="Your name">
        </div>
        <div class="engage-widget-field">
          <input type="email" name="email" required placeholder="Your email">
        </div>
        <div class="engage-widget-field">
          <input type="tel" name="phone" placeholder="Phone (optional)">
        </div>
        <button type="submit" class="engage-widget-submit">Connect with Team</button>
      </form>
    `;
    
    attachHandoffFormHandlers();
  }

  // Attach handlers to handoff form
  function attachHandoffFormHandlers() {
    const form = document.getElementById('engage-handoff-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const submitBtn = form.querySelector('.engage-widget-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting...';
        
        await requestHandoff({
          visitorName: formData.get('name'),
          visitorEmail: formData.get('email'),
          visitorPhone: formData.get('phone')
        });
        
        showChatView();
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SOCKET.IO REALTIME CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════════
  
  let socket = null;
  let agentTypingTimeout = null;
  
  function subscribeToSession(chatSessionId) {
    if (!window.io) {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => connectSocket(chatSessionId);
      document.head.appendChild(script);
    } else {
      connectSocket(chatSessionId);
    }
  }

  // Connect to Portal API WebSocket (human handoff)
  function connectSocket(chatSessionId) {
    try {
      sessionId = chatSessionId;
      
      socket = window.io(PORTAL_API_URL.replace(/\/$/, '') + '/engage/chat', {
        query: {
          apiKey: apiKey,
          visitorId: visitorId,
          sessionId: chatSessionId
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('[Engage] Socket connected');
        // Can stop polling when socket is connected
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('[Engage] Socket disconnected:', reason);
        // Fallback to polling if disconnected
        startPolling();
      });

      socket.on('connect_error', (error) => {
        console.error('[Engage] Socket connection error:', error.message);
        // Fallback to polling
        startPolling();
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Message Events
      // ─────────────────────────────────────────────────────────────────────────

      // Agent or AI message received
      socket.on('message', (data) => {
        console.log('[Engage] Message received:', data.role);
        hideAgentTypingIndicator();
        
        const msgId = `socket_${Date.now()}`;
        if (!messages.find(m => m.content === data.content && m.role === data.role)) {
          messages.push({
            id: msgId,
            role: data.role,
            content: data.content
          });
          updateMessagesUI();
          
          if (config?.playSoundOnMessage) {
            playNotificationSound();
          }
        }
      });

      // Agent joined the chat
      socket.on('agent:joined', (data) => {
        console.log('[Engage] Agent joined:', data.agentName);
        messages.push({
          role: 'system',
          content: `${data.agentName || 'An agent'} has joined the chat.`
        });
        updateMessagesUI();
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Typing Events
      // ─────────────────────────────────────────────────────────────────────────

      // Agent is typing
      socket.on('typing', (data) => {
        if (data.isTyping) {
          showAgentTypingIndicator();
          // Auto-hide after 3 seconds if no updates
          if (agentTypingTimeout) clearTimeout(agentTypingTimeout);
          agentTypingTimeout = setTimeout(hideAgentTypingIndicator, 3000);
        } else {
          hideAgentTypingIndicator();
        }
      });

      // ─────────────────────────────────────────────────────────────────────────
      // Session Events
      // ─────────────────────────────────────────────────────────────────────────

      // Chat was transferred to another agent
      socket.on('agent:changed', (data) => {
        messages.push({
          role: 'system',
          content: data.message || "You've been transferred to another team member."
        });
        updateMessagesUI();
      });

      // Chat was closed
      socket.on('chat:closed', (data) => {
        messages.push({
          role: 'system',
          content: data.message || 'This chat has been closed. Thank you!'
        });
        updateMessagesUI();
      });

      console.log('[Engage] Socket.io connection established');
    } catch (error) {
      console.error('[Engage] Socket setup failed:', error);
      // Fallback to polling
      startPolling();
    }
  }
  
  // Send visitor typing status
  function sendVisitorTyping(isTyping) {
    if (socket?.connected) {
      socket.emit('visitor:typing', { isTyping });
    }
  }
  
  // Send message via socket (faster than HTTP)
  function sendMessageViaSocket(content) {
    if (socket?.connected) {
      socket.emit('visitor:message', { content });
      return true;
    }
    return false;
  }

  // Show "Agent is typing..." indicator
  function showAgentTypingIndicator() {
    const messagesContainer = document.getElementById('engage-messages');
    if (!messagesContainer) return;
    
    // Remove existing typing indicator if present
    hideAgentTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'engage-agent-typing';
    indicator.className = 'engage-widget-message ai typing';
    indicator.innerHTML = `
      <span></span><span></span><span></span>
      <span class="engage-typing-text">Agent is typing...</span>
    `;
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Hide agent typing indicator
  function hideAgentTypingIndicator() {
    const indicator = document.getElementById('engage-agent-typing');
    if (indicator) indicator.remove();
    if (agentTypingTimeout) {
      clearTimeout(agentTypingTimeout);
      agentTypingTimeout = null;
    }
  }

  // Cleanup socket connections
  function cleanupRealtime() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    if (echoSocket) {
      echoSocket.disconnect();
      echoSocket = null;
    }
    hideAgentTypingIndicator();
  }

  // Show chat view after form submission
  function showChatView() {
    const body = document.getElementById('engage-body');
    body.innerHTML = renderChatView();
    attachChatHandlers();
    startPolling();
  }

  // Update messages UI
  function updateMessagesUI() {
    const messagesContainer = document.getElementById('engage-messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = messages.map(msg => {
      if (msg.role === 'form' && msg.formSlug) {
        return `<div class="engage-widget-message form"><span class="engage-form-placeholder">Form ready: ${escapeHtml(msg.formSlug)}. Use echo:form:get to fetch and render.</span></div>`;
      }
      return `<div class="engage-widget-message ${msg.role}">${escapeHtml(msg.content || '')}</div>`;
    }).join('');
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Poll for new messages – Portal API
  function startPolling() {
    const chatSessionId = sessionStorage.getItem('engage_chat_session');
    if (!chatSessionId) return;
    
    pollingInterval = setInterval(async () => {
      try {
        const url = new URL(`${PORTAL_API_URL}/engage/widget/messages`);
        url.searchParams.set('sessionId', chatSessionId);
        
        const response = await fetch(url, {
          headers: { 'X-API-Key': apiKey }
        });
        const res = await response.json();
        const msgList = res?.data;
        
        if (Array.isArray(msgList) && msgList.length > 0) {
          // Add new messages (filter out ones we already have)
          msgList.forEach(msg => {
            const msgId = msg.id;
            const msgRole = msg.role || (msg.sender?.type === 'agent' ? 'agent' : 'visitor');
            const msgContent = msg.content || msg.text || '';
            if (!messages.find(m => m.id === msgId)) {
              messages.push({
                id: msgId,
                role: msgRole,
                content: msgContent
              });
              lastMessageTime = msg.created_at || msg.createdAt;
              
              // Play sound for agent messages
              if (msg.role === 'agent' && config.playSoundOnMessage) {
                playNotificationSound();
              }
            }
          });
          
          updateMessagesUI();
        }
      } catch (error) {
        console.error('[Engage] Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  // Track analytics event – Portal API (event endpoint; elementId optional, no-op when absent)
  async function trackEvent(eventType, metadata = {}) {
    try {
      const chatSessionId = sessionStorage.getItem('engage_chat_session');
      
      await fetch(`${PORTAL_API_URL}/engage/widget/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          eventType,
          pageUrl: window.location.href,
          visitorId,
          sessionId: chatSessionId || '',
          deviceType: getDeviceType(),
          metadata
        })
      });
    } catch (error) {
      // Silently fail for analytics
    }
  }

  // Utility functions
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function playNotificationSound() {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silently fail if audio not supported
    }
  }

  // Initialize
  fetchConfig();
})();
