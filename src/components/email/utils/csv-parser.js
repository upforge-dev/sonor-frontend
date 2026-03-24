/**
 * CSV Parser for subscriber imports.
 * Handles quoted fields, commas inside quotes, CRLF, BOM.
 */

export function parseSubscriberCsv(text) {
  try {
    const cleaned = text.replace(/^\uFEFF/, '') // strip BOM

    const rows = []
    let fields = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i]
      if (ch === '"') {
        if (inQuotes && cleaned[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && cleaned[i + 1] === '\n') i++
        fields.push(current.trim())
        current = ''
        if (fields.some(f => f !== '')) rows.push(fields)
        fields = []
      } else {
        current += ch
      }
    }
    fields.push(current.trim())
    if (fields.some(f => f !== '')) rows.push(fields)

    if (rows.length < 2) return null

    const headers = rows[0].map(h => h.toLowerCase().replace(/^["']|["']$/g, ''))
    const dataRows = rows.slice(1).map(row => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] || '' })
      return obj
    })

    return { headers, rows: dataRows }
  } catch {
    return null
  }
}

/** Skip obvious garbage only; API @IsEmail() rejects the rest. */
export function isLikelySubscriberEmail(email) {
  const e = email.trim().toLowerCase()
  if (e.length < 3 || e.length > 254) return false
  const at = e.lastIndexOf('@')
  if (at <= 0 || at === e.length - 1) return false
  const domain = e.slice(at + 1)
  return domain.includes('.')
}

/**
 * Map a CSV row object to a subscriber shape.
 * Handles common header variations (email, e-mail, Email Address, etc.)
 */
export function rowToSubscriber(row) {
  const email =
    row.email ||
    row['e-mail'] ||
    row['email address'] ||
    row['email_address'] ||
    row['emailaddress'] ||
    ''
  const firstName =
    row.first_name ||
    row.firstname ||
    row['first name'] ||
    row.firstName ||
    ''
  const lastName =
    row.last_name ||
    row.lastname ||
    row['last name'] ||
    row.lastName ||
    ''
  let tags = []
  const tagRaw = row.tags || row.tag || ''
  if (tagRaw) {
    tags = tagRaw
      .split(/[,;|]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }
  return {
    email: email.trim().toLowerCase(),
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    tags: tags.length ? tags : undefined,
  }
}
