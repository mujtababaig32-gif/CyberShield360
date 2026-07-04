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

function alignClass(align: CyberTableColumn<unknown>["align"]) {
  const resolved = align ?? "center";

  if (resolved === "left") return "text-left";
  if (resolved === "right") return "text-right";

  return "text-center";
}

export default function CyberTable<T>({
  title,
  description,
  columns,
  data,
  emptyText = "No records available yet.",
  action,
}: CyberTableProps<T>) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-black tracking-tight text-white">{title}</h2>

          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
          )}
        </div>

        {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
      </div>

      {/* Mobile: convert wide tables into readable record cards. */}
      <div className="space-y-3 p-3 md:hidden">
        {data.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <article
              key={rowIndex}
              className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/45 p-4 shadow-lg shadow-black/10"
            >
              <div className="divide-y divide-white/10">
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className="grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-slate-500">
                      {column.label}
                    </div>
                    <div className="min-w-0 break-words text-left text-sm text-slate-300">
                      {column.render(row)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </div>

      {/* Tablet/Desktop: retain the dense tabular view. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-5 py-4 font-black ${alignClass(
                    column.align
                  )}`}
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
                <tr key={index} className="transition hover:bg-white/[0.03]">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-4 align-middle text-slate-300 ${alignClass(
                        column.align
                      )}`}
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
