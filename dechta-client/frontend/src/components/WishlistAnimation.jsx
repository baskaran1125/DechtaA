import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

export default function WishlistAnimation({ id, startX, startY, onComplete }) {
    const [render, setRender] = useState(false);
    const [style, setStyle] = useState({});

    useEffect(() => {
        // Get the target (wishlist icon in the navbar)
        const targetElement = document.getElementById('navbar-wishlist-icon');

        let endX = window.innerWidth / 2; // Default to top-middle
        let endY = 20;

        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            endX = rect.left + (rect.width / 2);
            endY = rect.top + (rect.height / 2);
        }

        // Set CSS custom properties for the keyframes
        setStyle({
            '--start-x': `${startX}px`,
            '--start-y': `${startY}px`,
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
            left: startX,
            top: startY,
        });

        // Trigger animation after next tick
        setTimeout(() => setRender(true), 10);

        // Remove element after animation completes (1000ms animation duration)
        const timer = setTimeout(() => {
            onComplete(id);
        }, 1000);

        return () => clearTimeout(timer);
    }, [startX, startY, id, onComplete]);

    if (!render) return null;

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{
                ...style,
                animation: 'flyToWishlistX 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
            }}
        >
            <div
                style={{
                    animation: 'flyToWishlistY 1s cubic-bezier(0.5, 0, 0.8, 0.5) forwards'
                }}
            >
                <div className="bg-red-500 rounded-full p-2 shadow-lg shadow-red-500/50">
                    <Heart className="w-5 h-5 text-white fill-current" />
                </div>
            </div>
        </div>
    );
}
