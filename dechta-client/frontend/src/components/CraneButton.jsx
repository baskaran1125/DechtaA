import { Map } from 'lucide-react';

export default function CraneButton({ onClick }) {
    return (
        <div id="crane-wrapper" className="fixed top-20 right-8 z-30 hidden md:flex flex-col items-center pointer-events-none origin-top">
            <img src="https://image.similarpng.com/file/similarpng/original-picture/2020/08/Crane-hook-on-transparent-background-PNG.png"
                className="w-14 h-20 object-contain -mb-6 relative z-20 drop-shadow-lg" alt="Crane Hook" />
            <button onClick={onClick}
                className="pointer-events-auto bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold shadow-2xl hover:scale-110 transition-transform duration-200 ease-out group flex items-center gap-2 border-2 border-yellow-400 relative z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-gray-500 rounded-full" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rounded-full" />
                <span>Hire Pros</span>
                <div className="w-6 h-6 bg-[#0CEDED] rounded-full flex items-center justify-center text-black">
                    <Map className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                </div>
            </button>
        </div>
    );
}
