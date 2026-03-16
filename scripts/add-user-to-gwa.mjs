import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mwcjtnoqxolplwpkxnfe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const gwaOrgId = '9a05474b-7a6e-432b-a41a-1ba2a6b11600';
const userEmail = 'ramsey@sonor.io';

// Check current user_organizations
const { data: existing } = await supabase
  .from('user_organizations')
  .select('*')
  .eq('user_email', userEmail);

console.log('Existing user_organizations for ramsey:', existing?.length);
existing?.forEach(uo => console.log(' -', uo.organization_id, '| role:', uo.role, '| primary:', uo.is_primary));

// Check if already in GWA
const hasGwa = existing?.some(uo => uo.organization_id === gwaOrgId);
console.log('\nAlready in GWA org:', hasGwa);

if (!hasGwa) {
  // Add to GWA org
  const { data: inserted, error } = await supabase
    .from('user_organizations')
    .insert({
      user_email: userEmail,
      organization_id: gwaOrgId,
      role: 'admin',
      is_primary: false
    })
    .select()
    .single();
  
  if (error) {
    console.log('Error adding to GWA:', error.message);
  } else {
    console.log('\n✅ Added to GWA org:', inserted);
  }
} else {
  console.log('Already a member, no action needed');
}
