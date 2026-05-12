export const LOCATION_DATA: Record<string, Record<string, string[]>> = {
  'Tamil Nadu': { 'Chennai': ['Adyar', 'Kodambakkam', 'T. Nagar', 'Tambaram'], 'Coimbatore': ['Gandhipuram', 'Peelamedu', 'R.S. Puram'] },
  'Karnataka': { 'Bengaluru': ['Whitefield', 'Koramangala', 'Indiranagar', 'Jayanagar'], 'Mysuru': ['Kuvempunagar', 'VV Mohalla'] },
  'Maharashtra': { 'Mumbai': ['Andheri', 'Bandra', 'Colaba'] },
  'Delhi': { 'New Delhi': ['Dwarka', 'Karol Bagh', 'Laxmi Nagar'] }
};

export const BANK_DATA: Record<string, Record<string, string>> = {
  'HDFC Bank': {
    'Koramangala, Bengaluru': 'HDFC0000001',
    'T. Nagar, Chennai': 'HDFC0000002',
    'Andheri, Mumbai': 'HDFC0000003'
  },
  'ICICI Bank': {
    'Whitefield, Bengaluru': 'ICIC0000010',
    'Adyar, Chennai': 'ICIC0000011',
    'Colaba, Mumbai': 'ICIC0000012'
  },
  'State Bank of India': {
    'Jayanagar, Bengaluru': 'SBI0000020',
    'Gandhipuram, Coimbatore': 'SBI0000021'
  }
};
