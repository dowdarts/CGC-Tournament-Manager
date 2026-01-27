import { supabase } from './src/services/supabase.js';

async function debugDatabase() {
  console.log('🔍 Debugging database connection and tables...\n');
  
  try {
    // Check if user_profiles table exists
    console.log('1. Checking user_profiles table...');
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
    
    // Test basic connection with tournaments table
    console.log('\n2. Testing tournaments table...');
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .limit(1);
    
    if (tournamentError) {
      console.error('❌ tournaments table error:', tournamentError);
    } else {
      console.log('✅ tournaments table works');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugDatabase();