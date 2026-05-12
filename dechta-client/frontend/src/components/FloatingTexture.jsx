import { useState, useEffect, useCallback } from 'react';
import {
    Hammer, Wrench, Ruler, Paintbrush, Plug,
    Axe, HardHat, Shovel, Scissors, Zap, Settings, Pipette
} from 'lucide-react';

const TOOLS = [
    Hammer, Wrench, Ruler, Paintbrush, Plug,
    Axe, HardHat, Shovel, Scissors, Zap, Settings, Pipette
];

const SPACING = 120;

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function buildIcons() {
    const cols = Math.ceil(window.innerWidth / SPACING);
    const rows = Math.ceil(window.innerHeight / SPACING);
    const icons = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const ToolIcon = TOOLS[Math.floor(Math.random() * TOOLS.length)];
            const jitterX = randomBetween(-30, 30);
            const jitterY = randomBetween(-30, 30);
            const left = c * SPACING + jitterX;
            const top = r * SPACING + jitterY;
            const size = Math.floor(randomBetween(30, 50));
            const rotate = Math.floor(randomBetween(0, 360));
            const delay = randomBetween(0, 5);

            icons.push({ key: `${r}-${c}`, ToolIcon, left, top, size, rotate, delay });
        }
    }
    return icons;
}

export default function FloatingTexture() {
    const [icons, setIcons] = useState(() => buildIcons());

    useEffect(() => {
        let timer;
        const handleResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setIcons(buildIcons()), 200);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            {icons.map(({ key, ToolIcon, left, top, size, rotate, delay }) => (
                <ToolIcon
                    key={key}
                    className="absolute text-black dark:text-white animate-float-gentle"
                    style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${size}px`,
                        height: `${size}px`,
                        transform: `rotate(${rotate}deg)`,
                        opacity: 0.03,
                        animationDelay: `${delay}s`,
                    }}
                />
            ))}
        </div>
    );
}
