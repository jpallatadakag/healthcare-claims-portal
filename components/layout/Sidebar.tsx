"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard",   icon: "▦" },
  { href: "/claims",    label: "Claims",       icon: "≡" },
  { href: "/analytics", label: "Analytics",    icon: "↗" },
  { href: "/validation",label: "Validation",   icon: "⚠" },
  { href: "/assistant", label: "AI Assistant", icon: "✦" },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname();
  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white w-64 shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-sm font-semibold text-blue-400 uppercase tracking-widest">Claims Portal</span>
        <p className="text-xs text-slate-400 mt-0.5">Claims Analytics</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors
                ${active
                  ? "bg-blue-600/20 text-blue-300 border-r-2 border-blue-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
        v1.0.0 · Local SQLite
      </div>
    </aside>
  );
}
