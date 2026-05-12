import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: { id?: number; name?: string; email?: string; role?: string } | null | undefined;
}

export default function ProfileModal({ open, onOpenChange, user }: ProfileModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-md rounded-2xl border-gray-200 p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800">Admin Profile</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">Account details and role information</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="mb-6 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-3xl font-bold text-white shadow-lg">
                            {user?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg bg-gray-50 p-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Name</Label>
                            <p className="mt-1 text-lg font-bold text-gray-900">{user?.name || '-'}</p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</Label>
                            <p className="mt-1 text-lg font-bold text-gray-900">{user?.email || '-'}</p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Admin ID</Label>
                            <p className="mt-1 text-lg font-bold text-gray-900">admin-{user?.id || '1'}</p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Role</Label>
                            <p className="mt-1 text-lg font-bold text-gray-900">
                                <Badge className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase text-purple-700 hover:bg-purple-100">
                                    {user?.role || 'admin'}
                                </Badge>
                            </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Account Status</Label>
                            <p className="mt-1 text-lg font-bold text-gray-900">
                                <Badge className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase text-green-700 hover:bg-green-100">
                                    Active
                                </Badge>
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-gray-200 pt-4 sm:justify-start sm:space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-10 flex-1 rounded-lg border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50"
                        >
                            Close
                        </Button>
                        <Button className="h-10 flex-1 rounded-lg bg-black text-sm font-bold text-cyan-400 shadow-md hover:opacity-85">
                            Edit Profile
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
