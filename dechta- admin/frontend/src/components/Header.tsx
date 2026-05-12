import { LogOut, Moon, Sun, UserCircle, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollPosition } from "@/hooks/useScrollPosition";

interface HeaderProps {
    email?: string;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onOpenProfile: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
}

export default function Header({ email, theme, onToggleTheme, onOpenProfile, onOpenSettings, onLogout }: HeaderProps) {
    const isDark = theme === 'dark';
    const { isScrolled } = useScrollPosition();

    // Debug log

    return (
        <header className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled 
                ? `top-4 h-14 rounded-full mx-auto max-w-6xl shadow-xl backdrop-blur-lg ${
                    isDark 
                        ? 'bg-slate-900/95 ring-2 ring-slate-700/50' 
                        : 'bg-white/95 ring-2 ring-gray-300/50'
                  }` 
                : `top-0 h-16 backdrop-blur-md shadow-sm ${
                    isDark
                        ? 'bg-slate-900/92 border-b border-slate-700/60'
                        : 'bg-white/80 border-b border-gray-200'
                  }`
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-white flex items-center justify-center font-display font-bold shadow-lg transition-all duration-300 ${
                        isScrolled ? 'w-8 h-8 text-base' : 'w-10 h-10 text-lg'
                    }`}>
                        D
                    </div>
                    <div>
                        <span className={`font-display font-bold bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent transition-all duration-300 ${
                            isScrolled ? 'text-lg' : 'text-xl'
                        }`}>DECHTA</span>
                        <span className={`ml-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                            isDark ? 'text-slate-400' : 'text-gray-500'
                        } ${isScrolled ? 'hidden sm:inline' : 'inline'}`}>Admin Portal</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                        <span className="h-2 w-2 rounded-full bg-cyan-500" />
                        Auto Refresh
                    </div>
                    <div className={`text-sm font-medium hidden sm:block ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        {email}
                    </div>
                    <Button
                        onClick={onToggleTheme}
                        variant="ghost"
                        size="icon"
                        className={`rounded-lg ${isDark ? 'hover:bg-slate-700/60 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
                        title="Toggle theme"
                    >
                        {theme === 'light' ? (
                            <Moon className="w-5 h-5" />
                        ) : (
                            <Sun className="w-5 h-5" />
                        )}
                    </Button>
                    <Button
                        onClick={onOpenProfile}
                        variant="ghost"
                        size="icon"
                        className={`rounded-lg ${isDark ? 'hover:bg-slate-700/60 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
                        title="View profile"
                    >
                        <UserCircle className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={onOpenSettings}
                        variant="ghost"
                        size="icon"
                        className={`rounded-lg ${isDark ? 'hover:bg-slate-700/60 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
                        title="Settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </Button>
                    <Button
                        onClick={onLogout}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-cyan-400 shadow-md transition-all hover:opacity-85 hover:shadow-lg"
                    >
                        <LogOut className="w-4 h-4" /> 
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
