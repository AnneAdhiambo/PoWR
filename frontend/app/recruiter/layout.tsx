"use client";

import { usePathname } from "next/navigation";
import { RecruiterSidebar } from "../components/recruiter/RecruiterSidebar";
import { RecruiterContextProvider } from "../components/recruiter/RecruiterContext";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/recruiter/auth") {
    return <>{children}</>;
  }

  return (
    <RecruiterContextProvider>
    <div className="flex min-h-screen bg-[var(--bg-main)]">
      <a href="#recruiter-main" className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-4 py-2 text-sm font-semibold text-white focus:translate-y-0">
        Skip to main content
      </a>
      <RecruiterSidebar />
      <main id="recruiter-main" tabIndex={-1} className="ml-0 min-h-screen min-w-0 flex-1 overflow-y-auto pt-16 md:ml-60 md:pt-0">
        {children}
      </main>
    </div>
    </RecruiterContextProvider>
  );
}
