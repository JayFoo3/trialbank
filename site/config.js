window.APP_CONFIG = {
  name: 'Trialbank',
  demo: false,
  supabaseUrl: 'https://xqkdggyksufbthskmmdz.supabase.co',
  supabaseAnonKey: 'sb_publishable_eJI_qmdm7H6VTax5x5zx8g_9MvxlIFz',
  subjects: { Ext2: 'Mathematics Extension 2', Ext1: 'Mathematics Extension 1', Adv: 'Mathematics Advanced', Std2: 'Mathematics Standard 2', Physics: 'Physics', Eng: 'Engineering Studies', SE: 'Software Engineering' },
  exam: { Ext2: { reading: 10, working: 180 }, Ext1: { reading: 10, working: 120 }, Adv: { reading: 10, working: 180 }, Physics: { reading: 5, working: 180 }, Eng: { reading: 5, working: 180 }, Std2: { reading: 10, working: 150 }, SE: { reading: 10, working: 140 } },  // minutes, editable on the page
  // subjects to announce with a "New on Trialbank" popup the first time each student sees them
  announce: ['Ext2'],
  schoolDomain: 'education.nsw.gov.au',
  // marking packs (must match the Stripe prices; the pack key is the number of marks)
  packs: [{ marks: 10, price: '$4.99' }, { marks: 25, price: '$9.99' }, { marks: 60, price: '$19.99' }],
};
