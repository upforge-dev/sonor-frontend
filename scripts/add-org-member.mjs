import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mwcjtnoqxolplwpkxnfe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const gwaOrgId = '9a05474b-7a6e-432b-a41a-1ba2a6b11600';

// Get Ramsey's contact ID
const { data: contact } = await supabase
  .from('contacts')
  .select('id, name, email')
  .eq('email', 'ramsey@sonor.io')
  .single();

if (!contact) {
  console.log('Contact not found');
  process.exit(1);
}

console.log('Contact:', contact);

// Check if already in organization_members
const { data: existing } = await supabase
  .from('organization_members')
  .select('*')
  .eq('organization_id', gwaOrgId)
  .eq('contact_id', contact.id)
  .single();

if (existing) {
  console.log('Already a member of organization_members');
} else {
  // Add to organization_members
  const { data: inserted, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: gwaOrgId,
      contact_id: contact.id,
      role: 'admin',
      access_level: 'organization'
    })
    .select()
    .single();
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Added to organization_members:', inserted);
  }
}
