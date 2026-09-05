'use client';

import React, { useState } from 'react';
import {
  Stethoscope,
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Building,
  Mail,
  UserCheck,
} from 'lucide-react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthView: React.FC = () => {
  const { login, loginAsGuest } = useAuth();

  const [name, setName] = useState('Dr. Alex Vance, MD');
  const [email, setEmail] = useState('a.vance@cardiorenal-health.org');
  const [facility, setFacility] = useState('Mercy Health Regional Medical Center');
  const [role, setRole] = useState<UserRole>('CLINICIAN');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    login({
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@medlens.internal`,
      role,
      facility: facility.trim() || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Top Disclaimer Header */}
      <div className="max-w-md w-full mx-auto text-center pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-6">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Non-Diagnostic Clinical Safety Boundary Active</span>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="max-w-md w-full mx-auto">
        <Card className="border-slate-700 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden">
          
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-14 h-14 rounded-2xl bg-sky-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-sky-600/30 ring-4 ring-sky-500/20">
              <Stethoscope className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>MedLens</span>
              <Badge variant="info" className="text-[10px] uppercase font-bold py-0.5">
                v2.0
              </Badge>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              AI-Powered Clinical Information Intelligence & Verification Workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            
            {/* Quick Guest / Judge Access Button */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-sky-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Judge & Reviewer Fast-Track:
                </span>
                <Badge variant="outline" className="text-[9px] text-sky-400 border-sky-500/40 py-0">
                  Instant 1-Click
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bypass manual credential entry and immediately launch the clinical workbench with a pre-configured clinician profile.
              </p>
              <Button
                type="button"
                onClick={() => loginAsGuest('CLINICIAN')}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold h-9 shadow-md shadow-sky-600/20 gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Quick Guest / Reviewer Login (Clinician)</span>
              </Button>
            </div>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-700 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                or sign in with credentials
              </span>
              <div className="border-t border-slate-700 w-full" />
            </div>

            {/* Manual Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* Role Toggle */}
              <div>
                <label className="text-slate-400 font-medium block mb-1.5">
                  Clinical User Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CLINICIAN')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      role === 'CLINICIAN'
                        ? 'bg-sky-600/20 border-sky-500 text-sky-300 font-bold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Clinician / MD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('PATIENT_PROXY')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      role === 'PATIENT_PROXY'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Patient / Proxy</span>
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Full Name / Identifier
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Alex Vance, MD"
                    required
                    className="pl-8 text-xs bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 h-9"
                  />
                </div>
              </div>

              {/* Email / Staff ID */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Email / Staff ID
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. a.vance@hospital.org"
                    className="pl-8 text-xs bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 h-9"
                  />
                </div>
              </div>

              {/* Facility Input */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">
                  Clinical Facility / Health System
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    placeholder="e.g. Mercy Health Regional Medical Center"
                    className="pl-8 text-xs bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 h-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold text-xs h-9 gap-2 shadow mt-2"
              >
                <span>Enter MedLens Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>

          {/* Clinical Safety Disclaimer in Login Box */}
          <CardFooter className="bg-slate-950/60 border-t border-slate-800/80 p-4">
            <div className="flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300 font-semibold block">
                  Mandatory Non-Diagnostic Disclaimer:
                </strong>
                For clinical synthesis and informational organization only. Not a medical diagnosis or treatment plan.
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* System Trust & Invariants Footer */}
      <div className="max-w-md w-full mx-auto text-center pb-4 pt-6">
        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Strict Range Guard
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-sky-400">
            <ShieldCheck className="w-3.5 h-3.5" /> HITL Verification
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-indigo-400">
            <Lock className="w-3.5 h-3.5" /> Zero-Storage Privacy
          </span>
        </div>
      </div>
    </div>
  );
};
