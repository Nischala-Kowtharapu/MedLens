'use client';

import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  User,
  Bot,
  Stethoscope,
  ArrowRight,
  RotateCcw,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileUp,
  FileCheck,
  Lock,
} from 'lucide-react';
import { AuditEvent, AuditEventType, AuditActor } from '@/types/audit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AuditTrailViewProps {
  events: AuditEvent[];
  onRollback?: (event: AuditEvent) => void;
  className?: string;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  events,
  onRollback,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');

  const filteredEvents = events.filter((ev) => {
    if (filterType !== 'ALL' && ev.eventType !== filterType) return false;
    if (actorFilter !== 'ALL' && ev.actor !== actorFilter) return false;
    return true;
  });

  const handleExportAuditJSON = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medlens-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm ${className}`}>
      
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Clinical Audit Trail & Provenance History
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono py-0">
                {events.length} Events
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Immutable chronological record of human and algorithmic interventions for regulatory compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportAuditJSON}
            className="text-xs h-8 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Log (JSON)</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium mr-1">Actor:</span>
          {['ALL', 'CLINICIAN', 'AI_SYSTEM', 'PATIENT'].map((act) => (
            <button
              key={act}
              onClick={() => setActorFilter(act)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                actorFilter === act
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'ALL' ? 'All Actors' : act}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium mr-1">Event:</span>
          {['ALL', 'VALUE_MODIFIED_BY_USER', 'RANGE_VERIFIED', 'DOCUMENT_UPLOADED', 'PHI_REDACTED'].map((evt) => (
            <button
              key={evt}
              onClick={() => setFilterType(evt)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterType === evt
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {evt === 'ALL' ? 'All Types' : evt.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Event Timeline List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto p-2">
        {filteredEvents.map((event) => {
          const isClinician = event.actor === 'CLINICIAN';
          const isAI = event.actor === 'AI_SYSTEM';
          const hasDiff = event.payloadDiff?.previousValue !== undefined && event.payloadDiff?.updatedValue !== undefined;

          return (
            <div
              key={event.id}
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3 flex-1">
                {/* Actor Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isClinician
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                      : isAI
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {isClinician ? <Stethoscope className="w-3.5 h-3.5" /> : isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {event.summary}
                    </span>

                    <Badge
                      variant={isClinician ? 'info' : isAI ? 'secondary' : 'success'}
                      className="text-[10px] py-0 font-mono"
                    >
                      {event.actor}
                    </Badge>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(event.timestamp).toLocaleTimeString()} • {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Value Diff Block */}
                  {hasDiff && (
                    <div className="inline-flex items-center gap-2 p-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs mt-1">
                      <span className="text-slate-500 font-semibold">{event.testName}:</span>
                      <span className="text-rose-600 line-through">
                        {String(event.payloadDiff?.previousValue)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-600 font-bold">
                        {String(event.payloadDiff?.updatedValue)}
                      </span>
                      {event.payloadDiff?.rationale && (
                        <span className="text-slate-500 text-[11px] italic font-sans ml-1">
                          ("{event.payloadDiff.rationale}")
                        </span>
                      )}
                    </div>
                  )}

                  {event.payloadDiff?.rationale && !hasDiff && (
                    <p className="text-slate-500 text-[11px] italic mt-0.5">
                      Note: {event.payloadDiff.rationale}
                    </p>
                  )}
                </div>
              </div>

              {/* Rollback Button for modified values */}
              {hasDiff && onRollback && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRollback(event)}
                  className="text-[11px] h-7 px-2 gap-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex-shrink-0"
                  title="Revert back to previous value"
                >
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span>Rollback</span>
                </Button>
              )}
            </div>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400">
            No audit events matched the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
