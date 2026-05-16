import React from 'react';

export default function OccupancyLegend() {
  return (
    <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-navy-800/50 p-4 rounded-xl border border-slate-200 dark:border-white/5">
      <div className="text-sm font-medium text-slate-600 dark:text-gray-300 mr-2">Live Density:</div>
      
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <span className="text-xs text-slate-500 dark:text-gray-400">Quiet (0-40%)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        <span className="text-xs text-slate-500 dark:text-gray-400">Moderate (41-70%)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <span className="text-xs text-slate-500 dark:text-gray-400">High (71-100%)</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="w-2 h-2 rounded-full bg-electric-500 animate-pulse" />
        <span className="text-xs font-mono text-electric-400">Live Sync</span>
      </div>
    </div>
  );
}

