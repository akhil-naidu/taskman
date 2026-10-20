"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BOARD_COLUMNS, boardColumn, type BoardColumnId } from "@/convex/model/columns";
import type { TaskView } from "@/convex/model/types";

const columns: ColumnDef<TaskView>[] = [
  {
    id: "title",
    accessorKey: "title",
    header: "Task",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 whitespace-normal">
        <span className="inline-block size-2 shrink-0 rounded-sm" style={{ background: row.original.orgColor }} />
        <span>{row.original.title}</span>
        {row.original.conflict ? <Badge variant="outline">Conflict</Badge> : null}
        {row.original.urgency === "high" ? <Badge variant="outline">High</Badge> : null}
      </span>
    ),
  },
  {
    id: "status",
    accessorFn: (task) => boardColumn(task),
    header: "Status",
    filterFn: (row, columnId, value) => !value || row.getValue(columnId) === value,
    sortingFn: (a, b, columnId) => statusIndex(String(a.getValue(columnId))) - statusIndex(String(b.getValue(columnId))),
    cell: ({ getValue }) => columnLabel(String(getValue())),
  },
  {
    id: "owner",
    accessorKey: "ownerLabel",
    header: "Owner",
    filterFn: (row, columnId, value) => !value || row.getValue(columnId) === value,
  },
  {
    id: "org",
    accessorKey: "org",
    header: "Org",
  },
];

function statusIndex(id: string): number {
  const index = BOARD_COLUMNS.findIndex((column) => column[0] === id);
  return index === -1 ? BOARD_COLUMNS.length : index;
}

function columnLabel(id: string): string {
  return BOARD_COLUMNS.find((column) => column[0] === id)?.[1] ?? id;
}

export function TaskTable({ tasks }: { tasks: TaskView[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "status", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const owners = useMemo(() => [...new Set(tasks.map((task) => task.ownerLabel))].sort(), [tasks]);
  // TanStack Table's hook returns functions the React compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters, grouping: ["status"], expanded: true },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });
  const statusFilter = String(table.getColumn("status")?.getFilterValue() ?? "");
  const ownerFilter = String(table.getColumn("owner")?.getFilterValue() ?? "");
  const groups = new Map(
    table
      .getRowModel()
      .rows.filter((row) => row.getIsGrouped())
      .map((row) => [String(row.groupingValue), row]),
  );
  const visible = BOARD_COLUMNS.filter(([id]) => !statusFilter || id === statusFilter);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Status
          <select
            aria-label="Filter by status"
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            value={statusFilter}
            onChange={(event) => table.getColumn("status")?.setFilterValue(event.target.value || undefined)}
          >
            <option value="">All</option>
            {BOARD_COLUMNS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Owner
          <select
            aria-label="Filter by owner"
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            value={ownerFilter}
            onChange={(event) => table.getColumn("owner")?.setFilterValue(event.target.value || undefined)}
          >
            <option value="">All</option>
            {owners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="-ml-1"
                        onClick={() => header.column.toggleSorting(sorted === "asc")}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? " ↑" : sorted === "desc" ? " ↓" : ""}
                      </Button>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visible.map(([id, label]) => {
              const group = groups.get(id);
              const rows = group?.subRows ?? [];
              return (
                <StatusGroup key={id} id={id} label={label} count={rows.length}>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-xs text-muted-foreground">
                        Nothing here
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={cell.column.id === "title" ? "whitespace-normal" : undefined}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </StatusGroup>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusGroup({
  id,
  label,
  count,
  children,
}: {
  id: BoardColumnId;
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <>
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={columns.length} className="text-xs font-medium">
          <span id={`status-${id}`}>{label}</span>
          <span className="ml-2 font-normal text-muted-foreground">{count}</span>
        </TableCell>
      </TableRow>
      {children}
    </>
  );
}
