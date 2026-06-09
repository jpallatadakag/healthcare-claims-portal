"use client";
import { useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";
import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform lg:static lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <span className="font-semibold text-slate-800 text-sm">Claims Portal</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
