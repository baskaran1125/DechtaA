import { useState } from "react";
import { TrendingUp, Package, DollarSign, ChevronRight, PackagePlus, Settings as SettingsIcon, ClipboardCheck, UserCheck, UserPlus, Image, BarChart3, MapPin, Truck, Wrench, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabType } from "@/types";

interface SidebarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const [showReportsMenu, setShowReportsMenu] = useState(false);
    const [showBulkMenu, setShowBulkMenu] = useState(false);

    return (
        <aside className="sidebar-fixed-scroll fixed left-4 top-24 hidden h-[calc(100vh-7rem)] w-64 shrink-0 flex-col overflow-y-auto rounded-2xl bg-black p-5 text-white shadow-2xl md:flex z-40">
            <div className="pt-2">
                <div className="mb-6 text-lg font-bold tracking-tight text-cyan-300">Admin Hub</div>

                <div className="space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Main Operations</div>
                    <Button
                        onClick={() => onTabChange('dashboard')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'dashboard' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <TrendingUp className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button
                        onClick={() => onTabChange('analytics')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'analytics' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                    </Button>
                    <Button
                        onClick={() => onTabChange('tracking')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'tracking' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <MapPin className="mr-2 h-4 w-4" /> GPS Tracking
                    </Button>
                    <Button
                        onClick={() => onTabChange('approvals')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'approvals' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Product Approvals
                    </Button>
                    <Button
                        onClick={() => onTabChange('onboarding')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'onboarding' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <UserCheck className="mr-2 h-4 w-4" /> New Request
                    </Button>
                    
                    <Button
                        onClick={() => onTabChange('onboarding-hub')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-sm font-semibold ${
                            activeTab === 'onboarding-hub' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <span className="flex items-center"><UserPlus className="mr-2 h-4 w-4" />Onboarding Hub</span>
                    </Button>

                    <div className="pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Reports & Insights</div>
                    <Button
                        onClick={() => setShowReportsMenu((v) => !v)}
                        variant="ghost"
                        className="h-10 w-full justify-between rounded-lg px-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                    >
                        <span className="flex items-center"><DollarSign className="mr-2 h-4 w-4" />Reports</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${showReportsMenu ? 'rotate-90' : ''}`} />
                    </Button>
                    {showReportsMenu && (
                        <div className="ml-3 space-y-1 border-l border-cyan-400/30 pl-3">
                            <Button onClick={() => onTabChange('jobs')} variant="ghost" className="h-9 w-full justify-start rounded-md text-xs text-cyan-200 hover:bg-white/10">Jobs Report</Button>
                            <Button onClick={() => onTabChange('support')} variant="ghost" className="h-9 w-full justify-start rounded-md text-xs text-cyan-200 hover:bg-white/10">Support Report</Button>
                            <Button onClick={() => onTabChange('drivers')} variant="ghost" className="h-9 w-full justify-start rounded-md text-xs text-cyan-200 hover:bg-white/10">Driver Report</Button>
                        </div>
                    )}

                    <div className="pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">Management</div>
                    <Button
                        onClick={() => onTabChange('pricing')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'pricing' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <Truck className="mr-2 h-4 w-4" /> Vehicle Pricing
                    </Button>
                    <Button
                        onClick={() => onTabChange('manpower-pricing')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'manpower-pricing' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <Wrench className="mr-2 h-4 w-4" /> Manpower Pricing
                    </Button>
                    <Button
                        onClick={() => onTabChange('notifications')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'notifications' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <Bell className="mr-2 h-4 w-4" /> Notifications
                    </Button>
                    <Button
                        onClick={() => onTabChange('banners')}
                        variant="ghost"
                        className={`h-10 w-full justify-start rounded-lg px-3 text-left text-sm font-semibold ${
                            activeTab === 'banners' ? 'bg-cyan-400/15 text-cyan-300' : 'text-white/90 hover:bg-white/10'
                        }`}
                    >
                        <Image className="mr-2 h-4 w-4" /> Banner Management
                    </Button>
                    <Button
                        onClick={() => setShowBulkMenu((v) => !v)}
                        variant="ghost"
                        className="h-10 w-full justify-between rounded-lg px-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                    >
                        <span className="flex items-center"><PackagePlus className="mr-2 h-4 w-4" />Bulk Upload</span>
                        <ChevronRight className={`h-4 w-4 transition-transform ${showBulkMenu ? 'rotate-90' : ''}`} />
                    </Button>
                    {showBulkMenu && (
                        <div className="ml-3 space-y-1 border-l border-cyan-400/30 pl-3">
                            <Button onClick={() => onTabChange('bulk-products')} variant="ghost" className={`h-9 w-full justify-start rounded-md text-xs ${activeTab === 'bulk-products' ? 'bg-cyan-400/15 text-cyan-300' : 'text-cyan-200 hover:bg-white/10'}`}>Add Products</Button>
                        </div>
                    )}

                    <div className="pt-4">
                        <Button
                            onClick={() => onTabChange('settings')}
                            variant="ghost"
                            className="h-10 w-full justify-start rounded-lg border border-white/10 px-3 text-sm font-semibold text-white/90 hover:bg-white/10"
                        >
                            <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
