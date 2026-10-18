// Copy this file to config.js and fill in your project's values (Supabase dashboard -> Project Settings -> API).
// The anon key is safe to publish: row-level security in the database is what protects the data.
window.APP_CONFIG = {
  name: 'Trialbank',
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY',
  subjects: { Ext1: 'Mathematics Extension 1', Physics: 'Physics' },
  exam: { Ext1: { reading: 10, working: 120 }, Physics: { reading: 5, working: 180 } },
  schoolDomain: 'education.nsw.gov.au',
};
