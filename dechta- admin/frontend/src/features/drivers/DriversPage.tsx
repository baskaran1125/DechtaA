import { useState } from "react";
import { Loader2, User, Mail, Phone, Car, CreditCard, FileText, Star, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { exportToCsv } from "@/utils/exportCsv";
import type { Driver } from "@/types";

interface DriversPageProps {
    drivers: Driver[] | undefined;
    driversLoading: boolean;
    filter?: 'all' | 'active' | 'offline';
    onFilterChange?: (filter: 'all' | 'active' | 'offline') => void;
}

export default function DriversPage({ drivers, driversLoading, filter = 'all', onFilterChange }: DriversPageProps) {
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const filteredDrivers = (drivers || []).filter(d => {
        if (filter === 'active') return d.status === 'active';
        if (filter === 'offline') return d.status !== 'active';
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Drivers Management</h2>
                    <p className="text-sm text-gray-500 mt-1">All registered drivers</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToCsv(filteredDrivers, [
                            { key: 'name', header: 'Name' },
                            { key: 'email', header: 'Email' },
                            { key: 'phone', header: 'Phone' },
                            { key: 'vehicleType', header: 'Vehicle Type' },
                            { key: 'vehicleNumber', header: 'Vehicle Number' },
                            { key: 'licenseNumber', header: 'License Number' },
                            { key: 'location', header: 'Location' },
                            { key: 'serviceRating', header: 'Rating' },
                            { key: 'status', header: 'Status' },
                        ], 'drivers_export')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['all', 'active', 'offline'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => onFilterChange?.(f)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors ${filter === f ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="text-sm font-semibold text-gray-600 px-4 py-2 bg-gray-100 rounded-lg">{filteredDrivers.length} Drivers</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <TableRow>
                                <TableHead className="px-6 py-3 text-left font-semibold w-16">Sl No</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Driver</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Contact</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Vehicle</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">License</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Location</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Rating</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100">
                            {driversLoading ? (
                                <TableRow><TableCell colSpan={5} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                            ) : filteredDrivers.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="px-6 py-8 text-center text-gray-500 italic">No drivers found</TableCell></TableRow>
                            ) : (
                                filteredDrivers.map((driver, index) => (
                                    <TableRow key={driver.id} className="hover:bg-cyan-50/30 transition-colors cursor-pointer" onClick={() => setSelectedDriver(driver)}>
                                        <TableCell className="px-6 py-4 text-gray-500">{index + 1}</TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-cyan-700">
                                            <div className="flex items-center gap-3">
                                                {driver.photoUrl ? (
                                                    <img src={driver.photoUrl} alt={driver.name} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                                                        <User className="w-5 h-5 text-cyan-600" />
                                                    </div>
                                                )}
                                                <span className="hover:underline">{driver.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">
                                            <div>{driver.email}</div>
                                            <div className="text-xs text-gray-500">{driver.phone}</div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">
                                            <div>{driver.vehicleType}</div>
                                            <div className="text-xs text-gray-500">{driver.vehicleNumber}</div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">{driver.licenseNumber}</TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">{driver.location || 'N/A'}</TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span>{driver.serviceRating || 'New'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <StatusBadge
                                                label={driver.status}
                                                colorClass={
                                                    driver.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    driver.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Driver Detail Modal */}
            <Dialog open={!!selectedDriver} onOpenChange={(open) => !open && setSelectedDriver(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">Driver Details</DialogTitle>
                    </DialogHeader>
                    {selectedDriver && (
                        <div className="space-y-4 mt-2">
                            <div className="flex items-center gap-3 pb-4 border-b">
                                <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                                    <User className="w-6 h-6 text-cyan-600" />
                                </div>
                                <div>
                                    <div className="font-semibold text-lg text-gray-900">{selectedDriver.name}</div>
                                    <StatusBadge
                                        label={selectedDriver.status}
                                        colorClass={
                                            selectedDriver.status === 'active' ? 'bg-green-100 text-green-700' :
                                            selectedDriver.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Email:</span>
                                    <span className="font-medium text-gray-900">{selectedDriver.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Phone:</span>
                                    <span className="font-medium text-gray-900">{selectedDriver.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Car className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Vehicle Type:</span>
                                    <span className="font-medium text-gray-900">{selectedDriver.vehicleType}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">Vehicle Number:</span>
                                    <span className="font-medium text-gray-900">{selectedDriver.vehicleNumber}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-500">License Number:</span>
                                    <span className="font-medium text-gray-900">{selectedDriver.licenseNumber}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
