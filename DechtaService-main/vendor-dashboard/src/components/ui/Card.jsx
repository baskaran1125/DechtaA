export const Card = ({ children, className='' }) => (
  <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950 ${className}`}>
    {children}
  </div>
);
