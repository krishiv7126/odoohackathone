import React from "react";

export interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function Table<T>({ columns, data, onRowClick, emptyMessage = "No records found" }: TableProps<T>) {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm bg-white table-container">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs select-none">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-6 py-3.5 ${col.className || ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-slate-50/70 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col, colIdx) => {
                  const rendered = typeof col.accessor === "function" 
                    ? col.accessor(row) 
                    : (row[col.accessor] as React.ReactNode);
                  return (
                    <td key={colIdx} className={`px-6 py-3.5 text-slate-700 font-medium ${col.className || ""}`}>
                      {rendered}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
