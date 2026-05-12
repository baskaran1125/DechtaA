import { useEffect, useRef } from 'react';

export function useScrollTrigger() {
    const ref = useRef(null);

    useEffect(() => {
        const container = ref.current || document;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        const elements = container.querySelectorAll('.scroll-trigger');
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return ref;
}
