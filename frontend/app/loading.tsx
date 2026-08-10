import { SquircleLoader } from "./components/ui/SquircleLoader";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0d] px-5 text-white" aria-busy="true" aria-live="polite">
      <SquircleLoader size={58} label="Loading PoWR" />
    </main>
  );
}
