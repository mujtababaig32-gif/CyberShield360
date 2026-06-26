import type { ReactNode } from "react";

type CyberTableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
};

type CyberTableProps<T> = {
  title: string;
  description?: string;
  columns: CyberTableColumn<T>[];
  data: T[];
  emptyText?: string;
  action?: ReactNode;
};

export default function CyberTable<T>({
  title,
  description,
  columns,
  data,
  emptyText = "No records available yet.",
  action,
}: CyberTableProps<T>) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-5 py-4 font-black ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className="transition hover:bg-white/[0.03]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 align-top text-slate-300 ${
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : "text-left"
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}