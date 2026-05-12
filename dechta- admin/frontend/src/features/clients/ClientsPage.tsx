import { Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { exportToCsv } from "@/utils/exportCsv";
import type { Client } from "@/types";

interface ClientsPageProps {
    clients: Client[] | undefined;
    clientsLoading: boolean;
    filter?: 'all' | 'manpower' | 'vendor';
}

export default function ClientsPage({ clients, clientsLoading, filter = 'all' }: ClientsPageProps) {
    const filteredClients = (clients ?? []).filter((client) => {
        if (filter === 'manpower') {
            return client.serviceType === 'manpower';
        }
        if (filter === 'vendor') {
            return client.serviceType === 'vendor';
        }
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Clients Management</h2>
                    <p className="text-sm text-gray-500 mt-1">All registered clients</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToCsv(filteredClients, [
                            { key: 'name', header: 'Name' },
                            { key: 'email', header: 'Email' },
                            { key: 'phone', header: 'Phone' },
                            { key: 'area', header: 'Area Known For' },
                            { key: 'serviceType', header: 'Service Type' },
                        ], 'clients_export')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                    <div className="text-sm font-semibold text-gray-600 px-4 py-2 bg-gray-100 rounded-lg">{filteredClients.length} Clients</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-sm">
                        <TableHeader className="bg-gray-50 text-gray-600 border-b border-gray-200">
                            <TableRow>
                                <TableHead className="px-6 py-3 text-left font-semibold w-16">S.No</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Name</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Contact</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Area Known For</TableHead>
                                <TableHead className="px-6 py-3 text-left font-semibold">Service Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-100">
                            {clientsLoading ? (
                                <TableRow><TableCell colSpan={5} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-500" /></TableCell></TableRow>
                            ) : filteredClients.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No clients found</TableCell></TableRow>
                            ) : (
                                filteredClients.map((client, index) => (
                                    <TableRow key={client.id} className="hover:bg-cyan-50/30 transition-colors">
                                        <TableCell className="px-6 py-4 text-gray-500">{index + 1}</TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-gray-900">{client.name}</TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">
                                            <div>{client.email}</div>
                                            <div className="text-xs text-gray-500">{client.phone}</div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-gray-600">{client.area}</TableCell>
                                        <TableCell className="px-6 py-4">
                                            <StatusBadge label={client.serviceType} colorClass="bg-blue-100 text-blue-700" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) }
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
