import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Main entry
    'index': 'src/index.ts',
    
    // SEO module
    'seo/index': 'src/seo/index.ts',
    'seo/server': 'src/seo/server.ts',
    
    // Analytics module
    'analytics/index': 'src/analytics/index.ts',
    
    // Engage module
    'engage/index': 'src/engage/index.ts',
    
    // Forms module
    'forms/index': 'src/forms/index.ts',
    
    // Blog module
    'blog/index': 'src/blog/index.ts',
    'blog/server': 'src/blog/server.ts',
    
    // Commerce module
    'commerce/index': 'src/commerce/index.ts',
    'commerce/server': 'src/commerce/server.ts',
    
    // Setup wizard - split client/server
    'setup/index': 'src/setup/index.ts',
    'setup/client': 'src/setup/client.ts',
    'setup/server': 'src/setup/server.ts',
    
    // Sitemap generator
    'sitemap/index': 'src/sitemap/index.ts',
    
    // Redirects middleware
    'redirects/index': 'src/redirects/index.ts',
    
    // Images module
    'images/index': 'src/images/index.ts',
    'images/server': 'src/images/server.ts',
    
    // Reputation module
    'reputation/index': 'src/reputation/index.ts',
    
    // LLMs module (llms.txt, AEO components)
    'llms/index': 'src/llms/index.ts',
    
    // CLI (built alongside library)
    'cli/index': 'src/cli/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    // Skip DTS for CLI
    entry: {
      'index': 'src/index.ts',
      'seo/index': 'src/seo/index.ts',
      'seo/server': 'src/seo/server.ts',
      'analytics/index': 'src/analytics/index.ts',
      'engage/index': 'src/engage/index.ts',
      'forms/index': 'src/forms/index.ts',
      'blog/index': 'src/blog/index.ts',
      'blog/server': 'src/blog/server.ts',
      'commerce/index': 'src/commerce/index.ts',
      'commerce/server': 'src/commerce/server.ts',
      'setup/index': 'src/setup/index.ts',
      'setup/client': 'src/setup/client.ts',
      'setup/server': 'src/setup/server.ts',
      'sitemap/index': 'src/sitemap/index.ts',
      'redirects/index': 'src/redirects/index.ts',
      'images/index': 'src/images/index.ts',
      'images/server': 'src/images/server.ts',
      'reputation/index': 'src/reputation/index.ts',
      'llms/index': 'src/llms/index.ts',
    },
  },
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'next',
    '@supabase/supabase-js',
    'server-only',
  ],
  // CLI dependencies should not be externalized
  noExternal: [
    'chalk',
    'commander',
    'inquirer',
    'ora',
    'glob',
    'open',
  ],
  treeshake: true,
  minify: false,
  target: 'es2020',
  async onSuccess() {
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Add shebang to CLI file after build
    const cliFiles = ['dist/cli/index.js', 'dist/cli/index.mjs']
    for (const file of cliFiles) {
      try {
        const fullPath = path.join(process.cwd(), file)
        let content = await fs.readFile(fullPath, 'utf-8')
        
        // Remove any existing shebang and add a fresh one
        content = content.replace(/^#!.*\n?/gm, '')
        content = '#!/usr/bin/env node\n' + content
        
        await fs.writeFile(fullPath, content, 'utf-8')
        
        // Make executable
        await fs.chmod(fullPath, 0o755)
      } catch {
        // File might not exist
      }
    }
    
    // Add 'use client' directive to client-side entry modules
    // This is needed because tsup strips the directive during bundling
    const clientModules = [
      'dist/forms/index.js',
      'dist/forms/index.mjs',
      'dist/analytics/index.js',
      'dist/analytics/index.mjs',
      'dist/engage/index.js',
      'dist/engage/index.mjs',
      'dist/setup/client.js',
      'dist/setup/client.mjs',
    ]
    
    for (const file of clientModules) {
      try {
        const fullPath = path.join(process.cwd(), file)
        let content = await fs.readFile(fullPath, 'utf-8')
        
        // Only add if not already present
        if (!content.startsWith("'use client'") && !content.startsWith('"use client"')) {
          content = "'use client';\n" + content
          await fs.writeFile(fullPath, content, 'utf-8')
        }
      } catch {
        // File might not exist
      }
    }

    // Also add 'use client' to shared chunks that contain React hooks
    // (needed for Turbopack when using linked packages with expanded root)
    const { glob: globFn } = await import('glob')
    const chunkFiles = await globFn('dist/chunk-*.{js,mjs}', { cwd: process.cwd() })
    const hookPatterns = /\bimport\s*\{[^}]*(useState|useEffect|useCallback|useRef|useContext|useMemo|useReducer)/
    
    for (const file of chunkFiles) {
      try {
        const fullPath = path.join(process.cwd(), file)
        let content = await fs.readFile(fullPath, 'utf-8')
        
        if (hookPatterns.test(content) && !content.startsWith("'use client'") && !content.startsWith('"use client"')) {
          content = "'use client';\n" + content
          await fs.writeFile(fullPath, content, 'utf-8')
        }
      } catch {
        // File might not exist
      }
    }
  },
})
