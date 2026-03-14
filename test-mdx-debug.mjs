#!/usr/bin/env node
/**
 * Debug script: fetch proposal MDX, run sanitization, try compile, find L20:C140
 */
import { createClient } from '@supabase/supabase-js'
import { evaluate } from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env
const envPath = resolve(process.cwd(), '.env.local')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...v] = line.split('=')
    if (key && !key.startsWith('#')) {
      const val = v.join('=').trim().replace(/^["']|["']$/g, '')
      if (val) process.env[key.trim()] = val
    }
  }
} catch (_) {}

// DEV ONLY: Do not import this file from the Vite app. Use service role only; never use anon key here.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Copy sanitizeMDXContent from ProposalView - with step tracing
function sanitizeMDXContent(mdxSource) {
  if (!mdxSource) return mdxSource
  let sanitized = mdxSource
  const steps = []
  const trace = (name, fn) => {
    const before = sanitized
    sanitized = fn(sanitized)
    if (before !== sanitized) steps.push({ name, had: before.includes("Free Intro"), snippet: (sanitized.match(/Friction in[^>]{0,50}/) || [])[0] })
  }
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '')
  sanitized = sanitized.replace(/<![\s\S]*?>/g, '')
  sanitized = sanitized.replace(/(\w+)=\[(\s*[\[\{"\w])/g, '$1={[$2')
  sanitized = sanitized.replace(/\](\s*)(\/?>)/g, ']}$1$2')
  sanitized = sanitized.replace(/\](\s+)(\w+=)/g, ']}$1$2')
  sanitized = sanitized.replace(/\\"/g, "'")
  sanitized = sanitized.replace(/(\w)'(\w)/g, '$1\u2019$2')
  sanitized = sanitized.replace(/\[([a-zA-Z][a-zA-Z\s]*)\]/g, "'$1'")
  sanitized = sanitized.replace(/<(\d)/g, 'less than $1')
  sanitized = sanitized.replace(/>(\d)/g, 'more than $1')
  sanitized = sanitized.replace(/"([^"]*)"\s*\.\s*"([^"]*)"/g, (_, prefix, suffix) => `"${prefix}. ${suffix}"`)
  sanitized = sanitized.replace(/"([^"]*)" (\.[a-zA-Z0-9]+)(")?/g, (_, value, fragment) => `"${value}${fragment}"`)
  sanitized = sanitized.replace(/"([^"]*)"(\.[a-zA-Z0-9]+)(?=[\s>\/]|$)/g, (_, value, fragment) => `"${value}${fragment}"`)
  sanitized = sanitized.replace(/"([^"]*)"\.(?=[\s>\/"'\)]|$)/g, (_, value) => `"${value}."`)
  sanitized = sanitized.replace(/"([^"]*)"\s+\.(?=[\s>\/"'\)]|$)/g, (_, value) => `"${value}."`)
  sanitized = sanitized.replace(/"([^"]*)" ([a-zA-Z0-9]*\.[a-zA-Z0-9]+)(?=[\s>\/]|$)/g, (_, value, fragment) => `"${value} ${fragment}"`)
  sanitized = sanitized.replace(/"([^"]*)"\s+(\.[^\s"<>\/=]*)(?=[\s>\/"']|$)/g, (_, value, fragment) => `"${value}${fragment}"`)
  sanitized = sanitized.replace(/"([^"]*)"\s+\.([a-zA-Z0-9]+)\s*"([^"]*)"/g, (_, prefix, mid, suffix) => `"${prefix}.${mid} ${suffix}"`)
  return { sanitized, steps }
}

async function main() {
  const { data, error } = await supabase
    .from('proposals')
    .select('mdx_content')
    .eq('id', '656ad863-0eb8-421b-a99d-36c2b517a69b')
    .single()

  if (error || !data?.mdx_content) {
    console.error('Failed to fetch:', error || 'No content')
    process.exit(1)
  }

  const raw = data.mdx_content
  const { sanitized, steps } = sanitizeMDXContent(raw)
  if (steps.length) {
    console.log('Steps that changed Friction/Free Intro:', steps)
  }

  const lines = sanitized.split(/\r?\n/)
  console.log('Total lines:', lines.length)
  console.log('--- Line 31 (period error) ---')
  const L31 = lines[30]
  if (L31) {
    console.log('Length:', L31.length)
    console.log('Col 215:', JSON.stringify(L31.slice(210, 225)))
    console.log('Full line:', L31)
  }

  try {
    await evaluate(sanitized, { ...runtime, development: false })
    console.log('\nCompile OK')
  } catch (err) {
    console.error('\nCompile error:', err.message)
    console.error('Full error:', err)
    const m = err.message.match(/(\d+):(\d+)/)
    if (m) {
      const [, line, col] = m
      const lineIdx = parseInt(line, 10) - 1
      const target = lines[lineIdx]
      console.log('Error line:', target)
      console.log('Char at col', col, ':', JSON.stringify(target?.[parseInt(col, 10) - 1]))
    }
    const offset = err.place?.offset ?? err.place?._bufferIndex
    console.log('Line 21:', lines[20])
    const start = Math.max(0, offset - 100)
    const snippet = sanitized.slice(start, offset + 50)
    console.log('Content at offset', offset, ':', JSON.stringify(snippet))
    console.log('Char at offset:', JSON.stringify(sanitized[offset]))
  }
}

main()
