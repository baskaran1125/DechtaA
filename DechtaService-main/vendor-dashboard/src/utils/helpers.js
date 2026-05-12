export const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
};

export const today = () => new Date().toISOString().slice(0, 10);

export const numberToWords = (num) => {
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ',
             'Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ',
             'Seventeen ','Eighteen ','Nineteen '];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const n = ('000000000' + Math.floor(num)).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += n[1]!='0' ? (a[+n[1]]||b[n[1][0]]+' '+a[n[1][1]])+'Crore '  :'';
  str += n[2]!='0' ? (a[+n[2]]||b[n[2][0]]+' '+a[n[2][1]])+'Lakh '   :'';
  str += n[3]!='0' ? (a[+n[3]]||b[n[3][0]]+' '+a[n[3][1]])+'Thousand ':'';
  str += n[4]!='0' ? (a[+n[4]]||b[n[4][0]]+' '+a[n[4][1]])+'Hundred ' :'';
  str += n[5]!='0' ? ((str!='') ? 'and ':'')+( a[+n[5]]||b[n[5][0]]+' '+a[n[5][1]]) :'';
  return str.trim() + ' Only';
};
