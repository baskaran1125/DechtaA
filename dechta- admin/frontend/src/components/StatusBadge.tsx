import { Badge } from "@/components/ui/badge";

export function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
    return (
        <Badge className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${colorClass}`}>
            {label}
        </Badge>
    );
}
