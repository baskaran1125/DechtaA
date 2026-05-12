import { Loader2 } from "lucide-react";

export function StatCard({ 
    icon, 
    label, 
    value, 
    trend, 
    trendColor = "text-gray-500", 
    loading, 
    iconBg = "bg-gray-100", 
    iconColor = "text-gray-600",
    subtitle = "",
    onClick
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    trend?: string;
    trendColor?: string;
    loading?: boolean;
    iconBg?: string;
    iconColor?: string;
    subtitle?: string;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            } : undefined}
            className={`group relative overflow-hidden rounded-3xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? "cursor-pointer" : ""}`}
        >
            <div className="relative p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-2xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                </div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                {subtitle && <div className="text-[10px] text-gray-400 mb-2">{subtitle}</div>}
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-bold text-gray-900">{value}</div>
                        {trend && <div className={`text-[10px] font-semibold ${trendColor}`}>{trend}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export function MiniStatCard({ 
    label, 
    value, 
    color = "text-gray-600",
    bgColor = "bg-gray-50",
    loading,
    onClick
}: {
    label: string;
    value: number | string;
    color?: string;
    bgColor?: string;
    loading?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            } : undefined}
            className={`rounded-3xl ${bgColor} p-3 text-center hover:shadow-sm transition-all border border-gray-200 ${onClick ? "cursor-pointer" : ""}`}
        >
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
            ) : (
                <div className={`text-xl font-bold ${color}`}>{value}</div>
            )}
        </div>
    );
}
