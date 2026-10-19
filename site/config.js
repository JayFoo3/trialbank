window.APP_CONFIG = {
  name: 'Trialbank',
  demo: false,
  supabaseUrl: 'https://xqkdggyksufbthskmmdz.supabase.co',
  supabaseAnonKey: 'sb_publishable_eJI_qmdm7H6VTax5x5zx8g_9MvxlIFz',
  subjects: { Ext2: 'Mathematics Extension 2', Ext1: 'Mathematics Extension 1', Adv: 'Mathematics Advanced', Std2: 'Mathematics Standard 2', Physics: 'Physics', Eng: 'Engineering Studies', SE: 'Software Engineering', Bio: 'Biology', Econ: 'Economics' },
  exam: { Ext2: { reading: 10, working: 180 }, Ext1: { reading: 10, working: 120 }, Adv: { reading: 10, working: 180 }, Physics: { reading: 5, working: 180 }, Bio: { reading: 5, working: 180 }, Econ: { reading: 5, working: 180 }, Eng: { reading: 5, working: 180 }, Std2: { reading: 10, working: 150 }, SE: { reading: 10, working: 140 } },  // minutes, editable on the page
  // subjects to announce with a "New on Trialbank" popup the first time each student sees them
  announce: ['Ext2', 'Bio', 'Econ'],
  // AI tutor (prototype, Pro only): which subjects it works in
  tutor: { subjects: ['Ext2', 'Ext1', 'Adv', 'Std2', 'Physics', 'Eng', 'SE', 'Bio', 'Econ'] },
  // paper PDFs are served from Backblaze B2 (supabase/functions/pdf-url)
  pdfStore: 'b2',
  schoolDomain: 'education.nsw.gov.au',
  // shown on info.html (pricing and policies); add the ABN once Stripe is set up under JAIOPS
  business: { name: 'JAIOPS', abn: '56 119 345 967', email: 'jaydenvujic@gmail.com' },
  // marking packs (must match the Stripe prices; the pack key is the number of marks)
  // Trialbank Pro prices shown on the site (AUD); the real prices live in Stripe
  pro: { monthly: 12.99, annual: 99 },
  packs: [{ marks: 10, price: '$4.99' }, { marks: 25, price: '$9.99' }, { marks: 60, price: '$19.99' }],
};
