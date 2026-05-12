import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toast, setToast] = useState({ visible: false, message: '' });
    const toastTimerRef = useRef(null);

    const showToast = useCallback((message) => {
        // Clear any pending toast timer
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        
        setToast({ visible: true, message });
        toastTimerRef.current = setTimeout(() => {
            setToast({ visible: false, message: '' });
            toastTimerRef.current = null;
        }, 2500);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Element */}
            <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full shadow-2xl z-[150] flex items-center gap-3 transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                <svg className="w-5 h-5 text-green-400 dark:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="font-bold text-sm">{toast.message}</span>
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
