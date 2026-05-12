import { Home, Heart, CalendarCheck, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function MobileBottomNav({
    currentPage,
    onHomeClick,
    onWishlistClick,
    onBookingsClick,
    onProfileClick,
    onLoginClick
}) {
    const { isLoggedIn } = useAuth();

    return (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-around items-center pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] px-2 z-50">
            <button
                onClick={onHomeClick}
                className={`flex flex-col items-center gap-1 ${currentPage === 'home' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
                <Home className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Home</span>
            </button>
            <button
                onClick={onWishlistClick}
                className={`flex flex-col items-center gap-1 ${currentPage === 'wishlist' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
                <Heart className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Wishlists</span>
            </button>
            <button
                onClick={onBookingsClick}
                className={`flex flex-col items-center gap-1 ${currentPage === 'bookings' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
                <CalendarCheck className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">Bookings</span>
            </button>
            <button
                onClick={isLoggedIn ? onProfileClick : onLoginClick}
                className={`flex flex-col items-center gap-1 ${currentPage === 'profile' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            >
                <User className="w-6 h-6" />
                <span className="text-[10px] font-medium tracking-wide">{isLoggedIn ? 'Profile' : 'Login'}</span>
            </button>
        </div>
    );
}
