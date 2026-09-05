'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { LongitudinalBiomarkerSeries } from '@/types/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LongitudinalTrendsViewProps {
  series: LongitudinalBiomarkerSeries[];
  onSelectSeries?: (testName: string) => void;
  onLoadLongitudinalDemo?: () => void;
  className?: string;
}

export const LongitudinalTrendsView: React.FC<LongitudinalTrendsViewProps> = ({
  series,
  onSelectSeries,
  onLoadLongitudinalDemo,
  className = '',
}) => {
  const [activeSeriesName, setActiveSeriesName] = useState<string | null>(
    series.length > 0 ? series[0].testName : null
  );

  const selectedSeries = series.find(s => s.testName === activeSeriesName) || series[0];

  if (series.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-300 flex items-center justify-center mx-auto mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          No Longitudinal Trend Data Available Yet
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
          Biomarker trajectories and sparkline trends appear when two or more clinical reports with matching tests across distinct dates are ingested.
        </p>
        {onLoadLongitudinalDemo && (
          <Button
            size="sm"
            onClick={onLoadLongitudinalDemo}
            className="text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load 3-Visit Longitudinal Scenario (Sarah Jenkins)</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {series.map((item) => {
          const isSelected = selectedSeries?.testName === item.testName;
          const isUp = item.direction === 'UP';
          const isDown = item.direction === 'DOWN';
          const isStable = item.direction === 'STABLE';

          // Biomarkers where an increase indicates worsening: e.g. Creatinine, HbA1c, Glucose, LDL, Triglycerides
          const isWorsening = isUp; 

          const firstPoint = item.dataPoints[0];
          const lastPoint = item.dataPoints[item.dataPoints.length - 1];

          // Compute SVG sparkline points
          const values = item.dataPoints.map(p => p.value);
          const minVal = Math.min(...values);
          const maxVal = Math.max(...values);
          const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

          const width = 160;
          const height = 48;
          const padding = 6;
          const points = item.dataPoints.map((p, idx) => {
            const x = padding + (idx / (item.dataPoints.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((p.value - minVal) / range) * (height - 2 * padding);
            return `${x},${y}`;
          }).join(' ');

          return (
            <div
              key={item.testName}
              onClick={() => {
                setActiveSeriesName(item.testName);
                if (onSelectSeries) onSelectSeries(item.testName);
              }}
              className={`p-4 rounded-xl border transition-all cursor-pointer bg-white dark:bg-slate-900 ${
                isSelected
                  ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                    {item.testName}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {item.category} • {item.dataPoints.length} draws
                  </span>
                </div>

                {/* Trajectory Chip */}
                <Badge
                  variant={isWorsening ? 'destructive' : isDown ? 'success' : 'secondary'}
                  className="text-[10px] font-mono py-0 px-1.5 flex items-center gap-1"
                >
                  {isUp && <ArrowUpRight className="w-3 h-3" />}
                  {isDown && <ArrowDownRight className="w-3 h-3" />}
                  {isStable && <Minus className="w-3 h-3" />}
                  <span>{item.direction} ({item.percentChange > 0 ? `+${item.percentChange}%` : `${item.percentChange}%`})</span>
                </Badge>
              </div>

              {/* Sparkline & Values */}
              <div className="flex items-end justify-between gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="text-[11px] text-slate-400">Latest finding:</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                      {lastPoint.value}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {item.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Baseline: {firstPoint.value} {item.unit} ({item.delta > 0 ? `+${item.delta}` : item.delta})
                  </div>
                </div>

                {/* SVG Sparkline */}
                <div className="w-28 h-12 flex items-center justify-center">
                  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible w-full h-full">
                    <polyline
                      fill="none"
                      stroke={isWorsening ? '#e11d48' : isDown ? '#059669' : '#0284c7'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                    {item.dataPoints.map((p, idx) => {
                      const x = padding + (idx / (item.dataPoints.length - 1)) * (width - 2 * padding);
                      const y = height - padding - ((p.value - minVal) / range) * (height - 2 * padding);
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r={idx === item.dataPoints.length - 1 ? "4" : "2.5"}
                          className={idx === item.dataPoints.length - 1 ? (isWorsening ? 'fill-rose-600' : 'fill-sky-600') : 'fill-slate-400 dark:fill-slate-500'}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Chronological Progression for Selected Marker */}
      {selectedSeries && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>Visit-by-Visit Progression: {selectedSeries.testName}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Sequential tracking across clinical encounters with verified draw dates and deltas.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
              Net Change: <strong className={selectedSeries.delta > 0 ? 'text-rose-600' : 'text-emerald-600'}>{selectedSeries.delta > 0 ? `+${selectedSeries.delta}` : selectedSeries.delta} {selectedSeries.unit}</strong> ({selectedSeries.percentChange > 0 ? `+${selectedSeries.percentChange}%` : `${selectedSeries.percentChange}%`})
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {selectedSeries.dataPoints.map((dp, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Visit #{idx + 1}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {dp.date}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {dp.value}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {selectedSeries.unit}
                  </span>
                  <Badge
                    variant={dp.status === 'HIGH' ? 'destructive' : dp.status === 'LOW' ? 'warning' : 'success'}
                    className="text-[9px] py-0 px-1 font-mono ml-auto"
                  >
                    {dp.status}
                  </Badge>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {dp.reportTitle}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
