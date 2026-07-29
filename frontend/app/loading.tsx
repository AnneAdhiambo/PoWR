export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0d] px-5 text-white" aria-busy="true" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-orange-500" />
        <p className="mt-4 text-sm text-gray-400">Loading PoWR</p>
      </div>
    </main>
  );
}
