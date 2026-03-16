#!/usr/bin/env node
/**
 * GWA Tenant Setup Script
 * 
 * Run: node scripts/setup-gwa-tenant.mjs
 * 
 * This directly creates the GWA organization in the database.
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Make sure your .env file is configured')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// GWA Tenant Configuration
const GWA_CONFIG = {
  name: "God's Workout Apparel",
  slug: 'gwa',
  domain: 'gwa.sonor.io', // or godworkoutapparel.com when live
  plan: 'pro',
  status: 'active',
  features: {
    // Always included (Uptrade core)
    billing: true,
    messages: true,
    files: true,
    proposals: true,
    projects: true,
    // Business modules for GWA
    analytics: true,
    ecommerce: true,  // Shopify integration
    blog: true,       // Content marketing
    seo: false,       // Not needed - using Shopify SEO
    crm: false,       // Not needed for ecommerce
    email_manager: false,
    forms: false,
  },
  theme: {
    primaryColor: '#d9b338',      // GWA Gold
    secondaryColor: '#c0c0c0',    // GWA Silver
    backgroundColor: '#0a0a0f',   // Dark background
    logoUrl: 'https://gwa.sonor.io/logo.svg',
    faviconUrl: 'https://gwa.sonor.io/favicon.ico',
  },
  crm_fields: [],
  // Shopify config (stored in organization_secrets)
  shopify: {
    storeDomain: 'gods-workout-apparel.myshopify.com', // Update with actual
    // accessToken goes in secrets
  }
}

async function setupGWATenant() {
  console.log('\n🏋️ Setting up GWA Tenant...\n')

  try {
    // 1. Check if already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', GWA_CONFIG.slug)
      .single()

    if (existing) {
      console.log(`⚠️  GWA organization already exists:`)
      console.log(`   ID: ${existing.id}`)
      console.log(`   Name: ${existing.name}`)
      console.log(`   Slug: ${existing.slug}`)
      console.log('\n   To recreate, first delete it from the database.')
      return existing
    }

    // 2. Create the organization
    const schemaName = `org_${GWA_CONFIG.slug.replace(/-/g, '_')}`
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: GWA_CONFIG.name,
        slug: GWA_CONFIG.slug,
        domain: GWA_CONFIG.domain,
        schema_name: schemaName,
        features: GWA_CONFIG.features,
        crm_fields: GWA_CONFIG.crm_fields,
        theme: GWA_CONFIG.theme,
        plan: GWA_CONFIG.plan,
        status: GWA_CONFIG.status,
      })
      .select()
      .single()

    if (orgError) {
      console.error('❌ Failed to create organization:', orgError.message)
      throw orgError
    }

    console.log(`✅ Created organization: ${organization.name}`)
    console.log(`   ID: ${organization.id}`)
    console.log(`   Slug: ${organization.slug}`)

    // 3. Create secrets record (for Shopify tokens, etc.)
    const { error: secretsError } = await supabase
      .from('organization_secrets')
      .insert({
        organization_id: organization.id,
        // Shopify secrets will be added via admin UI
        // shopify_access_token: process.env.GWA_SHOPIFY_ACCESS_TOKEN
      })

    if (secretsError) {
      console.warn('⚠️  Could not create secrets record:', secretsError.message)
    } else {
      console.log('✅ Created secrets record')
    }

    // 4. Create database schema for tenant
    const { error: schemaError } = await supabase.rpc('execute_sql', {
      sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
    })

    if (schemaError) {
      console.warn('⚠️  Could not create schema (may already exist):', schemaError.message)
    } else {
      console.log(`✅ Created schema: ${schemaName}`)
    }

    // 5. Grant permissions
    await supabase.rpc('execute_sql', {
      sql: `
        GRANT USAGE ON SCHEMA ${schemaName} TO service_role;
        GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO service_role;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO service_role;
        GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
        GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA ${schemaName} TO authenticated;
      `
    })
    console.log('✅ Granted schema permissions')

    // 6. Create base contacts table
    const { error: contactsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.contacts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          auth_user_id UUID,
          email TEXT UNIQUE,
          name TEXT,
          phone TEXT,
          company TEXT,
          website TEXT,
          role TEXT DEFAULT 'client',
          avatar TEXT,
          google_id TEXT,
          notes TEXT,
          tags JSONB DEFAULT '[]',
          source TEXT DEFAULT 'manual',
          pipeline_stage TEXT DEFAULT 'new',
          account_setup TEXT DEFAULT 'false',
          custom_fields JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_gwa_contacts_email 
          ON ${schemaName}.contacts(email);
      `
    })

    if (contactsError) {
      console.warn('⚠️  Could not create contacts table:', contactsError.message)
    } else {
      console.log('✅ Created contacts table')
    }

    // 7. Create analytics tables (since analytics is enabled)
    const { error: analyticsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visitor_id TEXT NOT NULL,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          ended_at TIMESTAMPTZ,
          page_count INTEGER DEFAULT 0,
          referrer TEXT,
          utm_source TEXT,
          utm_medium TEXT,
          utm_campaign TEXT,
          device_type TEXT,
          browser TEXT,
          country TEXT,
          city TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ${schemaName}.page_views (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID REFERENCES ${schemaName}.sessions(id),
          path TEXT NOT NULL,
          title TEXT,
          time_on_page INTEGER,
          scroll_depth INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_gwa_sessions_visitor 
          ON ${schemaName}.sessions(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_gwa_pageviews_session 
          ON ${schemaName}.page_views(session_id);
      `
    })

    if (analyticsError) {
      console.warn('⚠️  Could not create analytics tables:', analyticsError.message)
    } else {
      console.log('✅ Created analytics tables')
    }

    // 8. Create ecommerce tables
    const { error: ecomError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shopify_id TEXT UNIQUE,
          handle TEXT,
          title TEXT NOT NULL,
          description TEXT,
          product_type TEXT,
          vendor TEXT,
          price DECIMAL(10,2),
          compare_at_price DECIMAL(10,2),
          inventory_quantity INTEGER DEFAULT 0,
          images JSONB DEFAULT '[]',
          variants JSONB DEFAULT '[]',
          tags JSONB DEFAULT '[]',
          status TEXT DEFAULT 'active',
          synced_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS ${schemaName}.orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          shopify_id TEXT UNIQUE,
          order_number TEXT,
          contact_id UUID REFERENCES ${schemaName}.contacts(id),
          email TEXT,
          total_price DECIMAL(10,2),
          subtotal_price DECIMAL(10,2),
          total_tax DECIMAL(10,2),
          currency TEXT DEFAULT 'USD',
          financial_status TEXT,
          fulfillment_status TEXT,
          line_items JSONB DEFAULT '[]',
          shipping_address JSONB,
          billing_address JSONB,
          note TEXT,
          tags JSONB DEFAULT '[]',
          shopify_created_at TIMESTAMPTZ,
          synced_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_gwa_products_handle 
          ON ${schemaName}.products(handle);
        CREATE INDEX IF NOT EXISTS idx_gwa_orders_contact 
          ON ${schemaName}.orders(contact_id);
        CREATE INDEX IF NOT EXISTS idx_gwa_orders_shopify 
          ON ${schemaName}.orders(shopify_id);
      `
    })

    if (ecomError) {
      console.warn('⚠️  Could not create ecommerce tables:', ecomError.message)
    } else {
      console.log('✅ Created ecommerce tables')
    }

    // 9. Create blog table
    const { error: blogError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.blog_posts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT,
          category TEXT,
          excerpt TEXT,
          content TEXT,
          content_html TEXT,
          featured_image TEXT,
          featured_image_alt TEXT,
          author TEXT,
          reading_time INTEGER,
          meta_title TEXT,
          meta_description TEXT,
          status TEXT DEFAULT 'draft',
          featured BOOLEAN DEFAULT false,
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_gwa_blog_slug 
          ON ${schemaName}.blog_posts(slug);
        CREATE INDEX IF NOT EXISTS idx_gwa_blog_status 
          ON ${schemaName}.blog_posts(status);
      `
    })

    if (blogError) {
      console.warn('⚠️  Could not create blog table:', blogError.message)
    } else {
      console.log('✅ Created blog table')
    }

    // 10. Create files table
    const { error: filesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.files (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          contact_id UUID REFERENCES ${schemaName}.contacts(id),
          filename TEXT NOT NULL,
          storage_path TEXT NOT NULL,
          mime_type TEXT,
          file_size INTEGER,
          category TEXT DEFAULT 'general',
          is_public BOOLEAN DEFAULT false,
          uploaded_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_gwa_files_contact 
          ON ${schemaName}.files(contact_id);
      `
    })

    if (filesError) {
      console.warn('⚠️  Could not create files table:', filesError.message)
    } else {
      console.log('✅ Created files table')
    }

    // 11. Generate tracking script
    const baseUrl = 'https://app.sonor.io'
    const trackingScript = `<!-- Sonor Portal Analytics -->
<script>
  window.UPTRADE_CONFIG = {
    orgId: '${organization.id}',
    orgSlug: '${organization.slug}',
    apiEndpoint: '${baseUrl}/.netlify/functions'
  };
</script>
<script src="${baseUrl}/tracking.js" defer></script>
<!-- End Sonor Portal Analytics -->`

    console.log('\n' + '='.repeat(60))
    console.log('✅ GWA TENANT SETUP COMPLETE!')
    console.log('='.repeat(60))
    console.log('\n📊 Organization Details:')
    console.log(`   ID: ${organization.id}`)
    console.log(`   Name: ${organization.name}`)
    console.log(`   Slug: ${organization.slug}`)
    console.log(`   Domain: ${organization.domain}`)
    console.log(`   Schema: ${schemaName}`)
    console.log(`   Plan: ${organization.plan}`)
    
    console.log('\n🔧 Enabled Features:')
    Object.entries(GWA_CONFIG.features)
      .filter(([, v]) => v)
      .forEach(([k]) => console.log(`   ✓ ${k}`))

    console.log('\n📝 Next Steps:')
    console.log('   1. Add Shopify access token in Tenants admin panel')
    console.log('   2. Add the tracking script to gwa-nextjs layout')
    console.log('   3. Configure admin user via user_organizations table')

    console.log('\n📋 Tracking Script (add to gwa-nextjs/app/layout.tsx):')
    console.log('-'.repeat(60))
    console.log(trackingScript)
    console.log('-'.repeat(60))

    return organization

  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupGWATenant()
