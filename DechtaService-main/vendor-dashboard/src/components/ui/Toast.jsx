// Toast.jsx
import { useEffect } from 'react';
import { Icons } from './Icons';
export const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg   = type==='success' ? 'bg-green-500' : type==='error' ? 'bg-red-500' : 'bg-blue-500';
  const Icon = type==='success' ? Icons.CheckCircle : type==='error' ? Icons.AlertTriangle : Icons.Info;
  return (
    <div className={`fixed bottom-5 right-5 ${bg} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 slide-in z-50 no-print`}>
      <Icon /><span className="font-medium text-sm">{message}</span>
    </div>
  );
};
