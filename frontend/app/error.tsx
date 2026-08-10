"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0d] px-5 text-white">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-semibold">PoWR could not load this page.</h1>
        <p className="mt-4 text-sm leading-6 text-gray-400">Try again, or return to the public homepage.</p>
        <div className="mt-7 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-[var(--radius-control)] bg-orange-500 px-5 py-3 text-sm font-semibold text-white">Try again</button>
          <Link href="/" className="rounded-[var(--radius-control)] border border-white/15 px-5 py-3 text-sm font-semibold text-white">Go home</Link>
        </div>
      </div>
    </main>
  );
}
