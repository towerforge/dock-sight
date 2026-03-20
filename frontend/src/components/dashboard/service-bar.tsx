import React from 'react';
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Text,
} from "@tremor/react";
import type { DockerService } from '@/types/dashboard';

interface Props {
  items: DockerService[];
}

export const ServiceBar: React.FC<Props> = ({ items }) => {
  return (
    <div className="w-full">
      <Table className="mt-0">
        <TableHead>
          <TableRow className="border-b border-card-border">
            <TableHeaderCell className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">
              Name
            </TableHeaderCell>
            <TableHeaderCell className="text-slate-400 font-medium text-xs uppercase tracking-wider text-center py-4">
              Cont.
            </TableHeaderCell>
            <TableHeaderCell className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">
              CPU
            </TableHeaderCell>
            <TableHeaderCell className="text-slate-400 font-medium text-xs uppercase tracking-wider py-4">
              RAM
            </TableHeaderCell>
            <TableHeaderCell className="text-slate-400 font-medium text-xs uppercase tracking-wider text-right py-4">
              Status
            </TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody className="divide-y divide-card-border/30">
          {items.map((s) => (
            <TableRow
              key={s.name}
              onClick={() => window.location.href = `/service?name=${encodeURIComponent(s.name)}`}
              className="border-none transition-colors duration-150 hover:bg-white/5 cursor-pointer"
            >
              <TableCell className="py-3">
                <span className="font-medium text-white">{s.name}</span>
              </TableCell>

              <TableCell className="text-center py-3">
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-card-border text-slate-300 text-xs font-bold">
                  {s.containers}
                </div>
              </TableCell>

              <TableCell className="py-3">
                <Text className="font-mono text-blue-400 text-sm">
                  {s.info.cpu.percent.toFixed(2)}%
                </Text>
              </TableCell>

              <TableCell className="py-3">
                <Text className="font-mono text-emerald-400 text-sm">
                  {s.info.ram.percent.toFixed(2)}%
                </Text>
              </TableCell>

              <TableCell className="text-right py-3">
                {s.info.cpu.percent > 70 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">HIGH LOAD</span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">OK</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
