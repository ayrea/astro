interface CrossingTableProps {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export function CrossingTable({ title, rows }: CrossingTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-md border-2 border-border/60 px-3">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-32" />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <th
              colSpan={2}
              scope="colgroup"
              className="border-b border-border/40 py-1 text-left text-lg font-semibold"
            >
              {title}
            </th>
          </tr>
          {rows.map(({ label, value }) => (
            <tr key={label}>
              <th
                scope="row"
                className="py-1 pr-2 text-left font-medium text-muted-foreground"
              >
                {label}
              </th>
              <td className="py-1 text-left tabular-nums text-foreground whitespace-nowrap">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
