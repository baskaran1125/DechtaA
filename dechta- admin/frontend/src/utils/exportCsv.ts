/**
 * Generic CSV export utility.
 * Takes an array of objects, picks the specified columns, and triggers a
 * browser file download with the given filename.
 */
export function exportToCsv<T extends Record<string, any>>(
    data: T[],
    columns: { key: string; header: string }[],
    filename: string,
) {
    if (!data.length) return;

    const escape = (val: any): string => {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str}"`
            : str;
    };

    const header = columns.map(c => escape(c.header)).join(',');
    const rows = data.map(row =>
        columns
            .map(c => {
                // support nested keys like "client.name"
                const val = c.key.split('.').reduce((o: any, k) => o?.[k], row);
                return escape(val);
            })
            .join(','),
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
