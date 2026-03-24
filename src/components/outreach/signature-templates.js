/**
 * Email Signature Templates
 *
 * Three pure-function renderers that accept a config object and return
 * inline-styled HTML table markup suitable for email clients.
 *
 * All templates use <table> layout with inline styles for maximum
 * email client compatibility. No CSS classes, no <style> blocks.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const socialIcons = {
  linkedin: {
    url: (handle) => handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle}`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  },
  twitter: {
    url: (handle) => handle.startsWith('http') ? handle : `https://x.com/${handle.replace('@', '')}`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  },
  instagram: {
    url: (handle) => handle.startsWith('http') ? handle : `https://instagram.com/${handle.replace('@', '')}`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
  },
  facebook: {
    url: (handle) => handle.startsWith('http') ? handle : `https://facebook.com/${handle}`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  },
}

function renderSocialLinks(socials, brandColor) {
  if (!socials) return ''
  const links = Object.entries(socials)
    .filter(([, value]) => value)
    .map(([platform, handle]) => {
      const social = socialIcons[platform]
      if (!social) return ''
      const url = social.url(handle)
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-right:8px;color:${brandColor};text-decoration:none;">${social.svg}</a>`
    })
    .filter(Boolean)
    .join('')
  return links ? `<tr><td style="padding-top:12px;">${links}</td></tr>` : ''
}

/**
 * Resolve the effective CTA based on A/B test config and variant.
 * @param {object} config - Full signature config
 * @param {'A'|'B'|null} abVariant - Which variant to use, or null for default
 * @returns {{ label: string, url: string } | null}
 */
function resolveCtaForVariant(config, abVariant) {
  if (abVariant && config.abTest?.enabled) {
    const variant = abVariant === 'B' ? config.abTest.variantB : config.abTest.variantA
    if (variant?.ctaLabel && variant?.ctaUrl) {
      return { label: variant.ctaLabel, url: variant.ctaUrl }
    }
  }
  return config.bookingCta || null
}

function renderBookingCta(bookingCta, brandColor, template = 'classic') {
  if (!bookingCta?.label || !bookingCta?.url) return ''

  if (template === 'minimal') {
    return `<tr><td style="padding-top:8px;"><a href="${bookingCta.url}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:underline;font-size:13px;">${bookingCta.label}</a></td></tr>`
  }

  return `<tr><td style="padding-top:12px;"><a href="${bookingCta.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:8px 20px;background-color:${brandColor};color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:600;">${bookingCta.label}</a></td></tr>`
}

function escapeHtmlAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function renderPromoBanner(promoBanner) {
  if (!promoBanner?.active || !promoBanner?.imageUrl) return ''
  const img = `<img src="${escapeHtmlAttr(promoBanner.imageUrl)}" alt="${escapeHtmlAttr(promoBanner.altText || '')}" width="100%" style="display:block;max-width:600px;border-radius:4px;" />`
  const content = promoBanner.linkUrl
    ? `<a href="${promoBanner.linkUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">${img}</a>`
    : img
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr><td>${content}</td></tr></table>`
}

/**
 * @param {'cover'|'contain'} objectFit - cover fills a square (crops). contain fits whole image within max box (better for wide logos).
 */
function renderImage(imageUrl, imageShape, size = 80, objectFit = 'cover') {
  if (!imageUrl) return ''
  const src = escapeHtmlAttr(imageUrl)
  const borderRadius = imageShape === 'circle' ? '50%' : '4px'
  if (objectFit === 'contain') {
    const maxH = size
    // Cap width ~1.5× height so the column isn’t a wide empty frame for average logos; still fits wide marks via scale-down
    const maxW = Math.round(size * 1.5)
    if (imageShape === 'circle') {
      // No width/height on <img> (Gmail uses attrs for the selection rect). Inner <td> has fixed size so layout doesn’t collapse.
      const imgInCircle = `<img src="${src}" alt="" border="0" style="display:block;border:0;outline:none;max-width:${size}px;max-height:${size}px;width:auto;height:auto;object-fit:contain;margin:0 auto;-ms-interpolation-mode:bicubic;" />`
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td width="${size}" height="${size}" align="center" style="width:${size}px;height:${size}px;text-align:center;vertical-align:middle;border-radius:50%;overflow:hidden;line-height:normal;mso-line-height-rule:exactly;">${imgInCircle}</td></tr></table>`
    }
    // Fixed-size cell reserves space in preview + email tables; <img> stays attr-free so Gmail’s selection hugs intrinsic bounds (max-* + object-fit).
    const imgFit = `<img src="${src}" alt="" border="0" style="display:block;border:0;outline:none;max-width:${maxW}px;max-height:${maxH}px;width:auto;height:auto;margin:0 auto;border-radius:${borderRadius};object-fit:contain;-ms-interpolation-mode:bicubic;" />`
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;"><tr><td width="${maxW}" height="${maxH}" align="center" style="width:${maxW}px;height:${maxH}px;padding:0;text-align:center;vertical-align:middle;line-height:normal;mso-line-height-rule:exactly;">${imgFit}</td></tr></table>`
  }
  return `<img src="${src}" alt="" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:${borderRadius};object-fit:cover;" />`
}

// ---------------------------------------------------------------------------
// Classic Template
// ---------------------------------------------------------------------------

export function renderClassicSignature(config, abVariant = null) {
  const {
    name = '', title = '', company = '', email = '', phone = '', website = '',
    imageUrl, imageShape = 'circle',
    socials, promoBanner,
    brandColor = '#2563eb', textColor = '#333333',
  } = config

  const effectiveCta = resolveCtaForVariant(config, abVariant)
  const imageHtml = renderImage(imageUrl, imageShape, 80)
  const socialHtml = renderSocialLinks(socials, brandColor)
  const ctaHtml = renderBookingCta(effectiveCta, brandColor, 'classic')
  const bannerHtml = renderPromoBanner(promoBanner)

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${textColor};line-height:1.4;">
  <tr>
    <td style="padding-bottom:12px;">
      ${imageHtml ? `<div style="margin-bottom:10px;">${imageHtml}</div>` : ''}
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:16px;font-weight:700;color:${textColor};">${name}</td></tr>
        ${title ? `<tr><td style="font-size:13px;color:${brandColor};font-weight:600;">${title}${company ? ` | ${company}` : ''}</td></tr>` : ''}
      </table>
    </td>
  </tr>
  <tr><td style="border-top:2px solid ${brandColor};padding-top:10px;"></td></tr>
  <tr>
    <td>
      <table cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#666666;">
        ${email ? `<tr><td style="padding-bottom:2px;"><a href="mailto:${email}" style="color:#666666;text-decoration:none;">${email}</a></td></tr>` : ''}
        ${phone ? `<tr><td style="padding-bottom:2px;"><a href="tel:${phone.replace(/\s/g, '')}" style="color:#666666;text-decoration:none;">${phone}</a></td></tr>` : ''}
        ${website ? `<tr><td><a href="${website.startsWith('http') ? website : `https://${website}`}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:none;">${website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
      </table>
    </td>
  </tr>
  ${socialHtml ? `<tr><td><table cellpadding="0" cellspacing="0" border="0">${socialHtml}</table></td></tr>` : ''}
  ${ctaHtml ? `<tr><td><table cellpadding="0" cellspacing="0" border="0">${ctaHtml}</table></td></tr>` : ''}
</table>${bannerHtml}`
}

// ---------------------------------------------------------------------------
// Modern Template
// ---------------------------------------------------------------------------

export function renderModernSignature(config, abVariant = null) {
  const {
    name = '', title = '', company = '', email = '', phone = '', website = '',
    imageUrl, imageShape = 'square',
    socials, promoBanner,
    brandColor = '#2563eb', textColor = '#333333',
  } = config

  const effectiveCta = resolveCtaForVariant(config, abVariant)
  const imageHtml = renderImage(imageUrl, imageShape, 96, 'contain')
  const socialHtml = renderSocialLinks(socials, brandColor)
  const ctaHtml = effectiveCta?.label && effectiveCta?.url
    ? `<tr><td style="padding-top:10px;"><a href="${effectiveCta.url}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:none;font-size:13px;font-weight:600;">${effectiveCta.label} &rarr;</a></td></tr>`
    : ''
  const bannerHtml = renderPromoBanner(promoBanner)

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${textColor};line-height:1.4;">
  <tr>
    ${imageHtml ? `<td style="vertical-align:middle;padding-right:2px;">
      ${imageHtml}
    </td>` : ''}
    <td style="vertical-align:top;border-left:3px solid ${brandColor};padding-left:14px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:17px;font-weight:700;color:${textColor};padding-bottom:2px;">${name}</td></tr>
        ${title ? `<tr><td style="font-size:13px;color:${brandColor};font-weight:600;padding-bottom:6px;">${title}${company ? ` at ${company}` : ''}</td></tr>` : ''}
        <tr><td style="border-top:1px solid #e5e5e5;padding-top:6px;">
          <table cellpadding="0" cellspacing="0" border="0" style="font-size:12px;color:#888888;">
            ${email ? `<tr><td style="padding-bottom:2px;"><a href="mailto:${email}" style="color:#888888;text-decoration:none;">${email}</a></td></tr>` : ''}
            ${phone ? `<tr><td style="padding-bottom:2px;"><a href="tel:${phone.replace(/\s/g, '')}" style="color:#888888;text-decoration:none;">${phone}</a></td></tr>` : ''}
            ${website ? `<tr><td><a href="${website.startsWith('http') ? website : `https://${website}`}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:none;">${website.replace(/^https?:\/\//, '')}</a></td></tr>` : ''}
          </table>
        </td></tr>
        ${socialHtml ? `<tr><td><table cellpadding="0" cellspacing="0" border="0">${socialHtml}</table></td></tr>` : ''}
        ${ctaHtml}
      </table>
    </td>
  </tr>
</table>${bannerHtml}`
}

// ---------------------------------------------------------------------------
// Minimal Template
// ---------------------------------------------------------------------------

export function renderMinimalSignature(config, abVariant = null) {
  const {
    name = '', title = '', company = '', email = '', phone = '', website = '',
    socials, promoBanner,
    brandColor = '#2563eb', textColor = '#333333',
  } = config

  const effectiveCta = resolveCtaForVariant(config, abVariant)

  const contactParts = [email, phone, website?.replace(/^https?:\/\//, '')].filter(Boolean)
  const contactLine = contactParts.map((part, i) => {
    if (part === email) return `<a href="mailto:${part}" style="color:#888888;text-decoration:none;">${part}</a>`
    if (part === phone) return `<a href="tel:${phone.replace(/\s/g, '')}" style="color:#888888;text-decoration:none;">${part}</a>`
    return `<a href="${website?.startsWith('http') ? website : `https://${website}`}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:none;">${part}</a>`
  }).join(`<span style="color:#cccccc;margin:0 6px;">|</span>`)

  const socialLinks = socials ? Object.entries(socials)
    .filter(([, v]) => v)
    .map(([platform, handle]) => {
      const social = socialIcons[platform]
      if (!social) return ''
      return `<a href="${social.url(handle)}" target="_blank" rel="noopener noreferrer" style="color:${brandColor};text-decoration:none;font-size:12px;margin-right:10px;">${platform.charAt(0).toUpperCase() + platform.slice(1)}</a>`
    })
    .filter(Boolean)
    .join('') : ''

  const ctaHtml = renderBookingCta(effectiveCta, brandColor, 'minimal')
  const bannerHtml = renderPromoBanner(promoBanner)

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${textColor};line-height:1.5;">
  <tr><td style="font-size:15px;font-weight:600;color:${textColor};">${name}</td></tr>
  ${title || company ? `<tr><td style="font-size:12px;color:${brandColor};">${[title, company].filter(Boolean).join(' \u2022 ')}</td></tr>` : ''}
  <tr><td style="padding-top:6px;font-size:12px;color:#888888;">${contactLine}</td></tr>
  ${socialLinks ? `<tr><td style="padding-top:6px;">${socialLinks}</td></tr>` : ''}
  ${ctaHtml ? `<tr><td><table cellpadding="0" cellspacing="0" border="0">${ctaHtml}</table></td></tr>` : ''}
</table>${bannerHtml}`
}

// ---------------------------------------------------------------------------
// Template Registry
// ---------------------------------------------------------------------------

export const SIGNATURE_TEMPLATES = {
  classic: {
    name: 'Classic',
    description: 'Traditional layout with photo, divider, and stacked contact info',
    render: renderClassicSignature,
  },
  modern: {
    name: 'Modern',
    description: 'Two-column layout with accent bar and clean typography',
    render: renderModernSignature,
  },
  minimal: {
    name: 'Minimal',
    description: 'Text-only with subtle color accents — clean and compact',
    render: renderMinimalSignature,
  },
}

/**
 * Render a signature to HTML given its config.
 * @param {object} config - The signature config object
 * @param {'A'|'B'|null} [abVariant=null] - A/B test variant override
 * @returns {string} Inline-styled HTML string
 */
export function renderSignature(config, abVariant = null) {
  const template = config.template || 'classic'
  const renderer = SIGNATURE_TEMPLATES[template]?.render || renderClassicSignature
  return renderer(config, abVariant)
}

/**
 * Render a signature with a specific A/B test variant.
 * Convenience wrapper around renderSignature for use at send time.
 * @param {object} config - The signature config object
 * @param {'A'|'B'} variant - Which variant to render
 * @returns {string} Inline-styled HTML string
 */
export function renderSignatureWithAB(config, variant) {
  return renderSignature(config, variant)
}

// ---------------------------------------------------------------------------
// Animated Template HTML (for Puppeteer rendering)
// ---------------------------------------------------------------------------

/**
 * Generate the HTML page that Puppeteer will render for animated GIF capture.
 * Uses CSS animations on a transparent background.
 * @param {object} config
 * @param {string} animationStyle - 'fade-in' | 'slide-in' | 'typewriter'
 * @returns {string} Full HTML document
 */
export function renderAnimatedSignatureHTML(config, animationStyle = 'fade-in') {
  const {
    name = '', title = '', company = '',
    imageUrl, imageShape = 'circle',
    brandColor = '#2563eb', textColor = '#333333',
  } = config

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" class="photo anim-photo" style="width:80px;height:80px;border-radius:${imageShape === 'circle' ? '50%' : '4px'};object-fit:cover;" />`
    : ''

  const animations = {
    'fade-in': `
      .anim-photo { opacity: 0; animation: fadeIn 0.6s ease forwards 0.2s; }
      .anim-name { opacity: 0; animation: fadeIn 0.5s ease forwards 0.5s; }
      .anim-title { opacity: 0; animation: fadeIn 0.5s ease forwards 0.8s; }
      .anim-company { opacity: 0; animation: fadeIn 0.5s ease forwards 1.0s; }
      @keyframes fadeIn { to { opacity: 1; } }
    `,
    'slide-in': `
      .anim-photo { opacity: 0; transform: translateX(-20px); animation: slideIn 0.5s ease forwards 0.2s; }
      .anim-name { opacity: 0; transform: translateX(-20px); animation: slideIn 0.4s ease forwards 0.5s; }
      .anim-title { opacity: 0; transform: translateX(-20px); animation: slideIn 0.4s ease forwards 0.7s; }
      .anim-company { opacity: 0; transform: translateX(-20px); animation: slideIn 0.4s ease forwards 0.9s; }
      @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
    `,
    'typewriter': `
      .anim-photo { opacity: 0; animation: fadeIn 0.4s ease forwards 0.1s; }
      .anim-name { opacity: 0; animation: typeIn 0.6s steps(${name.length || 1}) forwards 0.3s; width: 0; overflow: hidden; white-space: nowrap; }
      .anim-title { opacity: 0; animation: fadeIn 0.4s ease forwards 1.0s; }
      .anim-company { opacity: 0; animation: fadeIn 0.4s ease forwards 1.2s; }
      @keyframes fadeIn { to { opacity: 1; } }
      @keyframes typeIn { to { opacity: 1; width: 100%; } }
    `,
  }

  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; font-family: Arial, Helvetica, sans-serif; }
  .container { display: inline-flex; flex-direction: column; align-items: center; padding: 16px; }
  .photo { margin-bottom: 12px; }
  .name { font-size: 20px; font-weight: 700; color: ${textColor}; margin-bottom: 4px; }
  .title { font-size: 14px; color: ${brandColor}; font-weight: 600; margin-bottom: 2px; }
  .company { font-size: 13px; color: #888888; }
  ${animations[animationStyle] || animations['fade-in']}
</style>
</head>
<body>
  <div class="container">
    ${imageHtml}
    <div class="name anim-name">${name}</div>
    ${title ? `<div class="title anim-title">${title}</div>` : ''}
    ${company ? `<div class="company anim-company">${company}</div>` : ''}
  </div>
</body>
</html>`
}
