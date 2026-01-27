const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pfujbgwgsxuhgvmeatjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdWpiZ3dnc3h1aGd2bWVhdGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyNzAzNzYsImV4cCI6MjA1MTg0NjM3Nn0.iFnECzJgNtFbV1I0k9HhpqVzlMYW2dMhiDrAePKZH0c';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDatabase() {
  console.log('🔍 Debugging database connection and tables...\n');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('tournaments')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError.message);
      return;
    }
    console.log('✅ Basic connection works');
    
    // Check if user_profiles table exists
    console.log('\n2. Checking user_profiles table...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ user_profiles table error:', profilesError);
      console.log('Code:', profilesError.code);
      console.log('Details:', profilesError.details);
      console.log('Hint:', profilesError.hint);
    } else {
      console.log('✅ user_profiles table exists');
      console.log('Sample data:', profilesData);
    }
    
    // Test authentication
    console.log('\n3. Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Current session:', authData.session ? 'Logged in' : 'Not logged in');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDatabase();