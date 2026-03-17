"use client";

import { usePathname } from "next/navigation";
import { RecruiterSidebar } from "../components/recruiter/RecruiterSidebar";

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/recruiter/auth") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <RecruiterSidebar />
      <div className="flex-1 ml-60 min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
