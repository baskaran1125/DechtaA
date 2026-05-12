import { Loader2, Users, ShoppingCart, Truck, Wrench, Briefcase, Package, HeadphonesIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line, RadialBarChart, RadialBar } from "recharts";
import type { AnalyticsData } from "@/types";

interface AnalyticsPageProps {
    analytics: AnalyticsData | undefined;
    analyticsLoading: boolean;
}

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6'];

const GRADIENT_COLORS = {
    cyan: ['#06b6d4', '#0891b2'],
    purple: ['#8b5cf6', '#7c3aed'],
    amber: ['#f59e0b', '#d97706'],
    red: ['#ef4444', '#dc2626'],
    green: ['#22c55e', '#16a34a'],
    blue: ['#3b82f6', '#2563eb'],
    pink: ['#ec4899', '#db2777'],
    indigo: ['#6366f1', '#4f46e5'],
} as const satisfies Record<string, readonly [string, string]>;

function TotalCard({ icon, label, value, color, loading, trend, gradientColors }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    color: string; 
    loading: boolean;
    trend?: number;
    gradientColors: readonly [string, string];
}) {
    const isPositive = (trend ?? 0) >= 0;
    
    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden">
            {/* Gradient Background Overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300" 
                 style={{ background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` }} />
            
            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                    {loading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mt-2" />
                    ) : (
                        <>
                            <p className="text-3xl font-extrabold text-gray-900 mb-1">{value.toLocaleString()}</p>
                            {trend !== undefined && (
                                <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    <span>{Math.abs(trend)}% vs last month</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className={`p-3.5 rounded-2xl shadow-md ${color} group-hover:scale-110 transition-transform duration-300`}
                     style={{ background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` }}>
                    <div className="text-white">{icon}</div>
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children, icon }: { 
    title: string; 
    subtitle: string; 
    children: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:shadow-xl transition-all duration-300 hover:border-gray-300">
            <div className="mb-5 flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        {icon}
                        {title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-gray-700">
                <p className="text-xs font-semibold text-gray-300 mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
                        {entry.name}: {entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage({ analytics, analyticsLoading }: AnalyticsPageProps) {
    if (analyticsLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    const totals = analytics?.totals || { users: 0, orders: 0, drivers: 0, workers: 0, clients: 0, jobs: 0, products: 0, tickets: 0 };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-cyan-600" />
                    Analytics & Insights
                </h2>
                <p className="text-sm text-gray-500 mt-1">Comprehensive platform analytics</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <TotalCard 
                    icon={<Users className="w-6 h-6" />} 
                    label="Total Users" 
                    value={totals.users} 
                    color="bg-cyan-50" 
                    loading={analyticsLoading}
                    trend={12.5}
                    gradientColors={GRADIENT_COLORS.cyan}
                />
                <TotalCard 
                    icon={<ShoppingCart className="w-6 h-6" />} 
                    label="Total Orders" 
                    value={totals.orders} 
                    color="bg-purple-50" 
                    loading={analyticsLoading}
                    trend={8.3}
                    gradientColors={GRADIENT_COLORS.purple}
                />
                <TotalCard 
                    icon={<Truck className="w-6 h-6" />} 
                    label="Active Drivers" 
                    value={totals.drivers} 
                    color="bg-blue-50" 
                    loading={analyticsLoading}
                    trend={5.7}
                    gradientColors={GRADIENT_COLORS.blue}
                />
                <TotalCard 
                    icon={<Wrench className="w-6 h-6" />} 
                    label="Workers" 
                    value={totals.workers} 
                    color="bg-indigo-50" 
                    loading={analyticsLoading}
                    trend={-2.1}
                    gradientColors={GRADIENT_COLORS.indigo}
                />
                <TotalCard 
                    icon={<Briefcase className="w-6 h-6" />} 
                    label="Clients" 
                    value={totals.clients} 
                    color="bg-pink-50" 
                    loading={analyticsLoading}
                    trend={15.2}
                    gradientColors={GRADIENT_COLORS.pink}
                />
                <TotalCard 
                    icon={<Package className="w-6 h-6" />} 
                    label="Jobs Created" 
                    value={totals.jobs} 
                    color="bg-amber-50" 
                    loading={analyticsLoading}
                    trend={22.8}
                    gradientColors={GRADIENT_COLORS.amber}
                />
                <TotalCard 
                    icon={<Package className="w-6 h-6" />} 
                    label="Products" 
                    value={totals.products} 
                    color="bg-green-50" 
                    loading={analyticsLoading}
                    trend={9.4}
                    gradientColors={GRADIENT_COLORS.green}
                />
                <TotalCard 
                    icon={<HeadphonesIcon className="w-6 h-6" />} 
                    label="Support Tickets" 
                    value={totals.tickets} 
                    color="bg-red-50" 
                    loading={analyticsLoading}
                    trend={-4.2}
                    gradientColors={GRADIENT_COLORS.red}
                />
            </div>

            {/* Charts Row 1 - User Growth & Users by Role */}
            <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="User Growth Trend" subtitle="Daily registrations over the last 30 days" icon={<TrendingUp className="w-5 h-5 text-cyan-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.userGrowth || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    tickFormatter={(v) => v?.slice(5)} 
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    allowDecimals={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#06b6d4" 
                                    strokeWidth={3}
                                    fill="url(#colorUsers)" 
                                    name="New Users" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Users by Role" subtitle="Distribution across different user categories" icon={<Users className="w-5 h-5 text-purple-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie 
                                    data={analytics?.usersByRole || []} 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={100}
                                    innerRadius={60}
                                    dataKey="value" 
                                    nameKey="name" 
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                >
                                    {(analytics?.usersByRole || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#gradient-${i})`} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Charts Row 2 - Orders & Jobs */}
            <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Orders by Status" subtitle="Real-time order pipeline distribution" icon={<ShoppingCart className="w-5 h-5 text-purple-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.ordersByStatus || []} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={i} id={`bar-gradient-${i}`} x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={color} stopOpacity={0.8}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={1}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={true} vertical={false} />
                                <XAxis 
                                    type="number" 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    allowDecimals={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 600 }} 
                                    width={100}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Orders">
                                    {(analytics?.ordersByStatus || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#bar-gradient-${i})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Jobs by Status" subtitle="Current workforce job allocation" icon={<Package className="w-5 h-5 text-amber-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={`job-${i}`} id={`job-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie 
                                    data={analytics?.jobsByStatus || []} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={65} 
                                    outerRadius={100} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                >
                                    {(analytics?.jobsByStatus || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#job-gradient-${i})`} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-sm font-medium">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Charts Row 3 - Jobs timeline & Drivers */}
            <div className="grid lg:grid-cols-2 gap-6">
                <ChartCard title="Jobs Creation Timeline" subtitle="Daily job activity over the last 30 days" icon={<Briefcase className="w-5 h-5 text-pink-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.jobsOverTime || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    tickFormatter={(v) => v?.slice(5)}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    allowDecimals={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={3}
                                    fill="url(#colorJobs)" 
                                    name="Jobs Created" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Driver Availability" subtitle="Active workforce status distribution" icon={<Truck className="w-5 h-5 text-blue-600" />}>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.driversByStatus || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={`driver-${i}`} id={`driver-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                    allowDecimals={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Drivers">
                                    {(analytics?.driversByStatus || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#driver-gradient-${i})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Charts Row 4 - Workers & Support */}
            <div className="grid lg:grid-cols-3 gap-6">
                <ChartCard title="Worker Approvals" subtitle="Onboarding pipeline status" icon={<Wrench className="w-5 h-5 text-green-600" />}>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    <linearGradient id="workerApproved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8}/>
                                    </linearGradient>
                                    <linearGradient id="workerPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                                <Pie 
                                    data={analytics?.workersByApproval || []} 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={85} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8' }}
                                >
                                    <Cell fill="url(#workerApproved)" />
                                    <Cell fill="url(#workerPending)" />
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={32} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Support Tickets" subtitle="Real-time ticket resolution status" icon={<HeadphonesIcon className="w-5 h-5 text-red-600" />}>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics?.ticketsByStatus || []} margin={{ left: -10 }}>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={`ticket-${i}`} id={`ticket-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis 
                                    tick={{ fontSize: 11, fill: '#64748b' }} 
                                    allowDecimals={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Tickets">
                                    {(analytics?.ticketsByStatus || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#ticket-gradient-${i})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Ticket Priority" subtitle="Urgency-based ticket categorization" icon={<AlertCircle className="w-5 h-5 text-amber-600" />}>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <defs>
                                    {COLORS.map((color, i) => (
                                        <linearGradient key={`priority-${i}`} id={`priority-gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1}/>
                                            <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie 
                                    data={analytics?.ticketsByPriority || []} 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={85} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    labelLine={{ stroke: '#94a3b8' }}
                                >
                                    {(analytics?.ticketsByPriority || []).map((_, i) => (
                                        <Cell key={i} fill={`url(#priority-gradient-${i})`} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={32} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
}
