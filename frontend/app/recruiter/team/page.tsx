"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

const roles = ["admin", "recruiter", "hiring_manager", "interviewer"];

export default function RecruiterTeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    recruiterApiClient.getTeamMembers().then((result) => setMembers(result.members)).catch(() => toast.error("Could not load team")).finally(() => setLoading(false));
  }, [router]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await recruiterApiClient.inviteTeamMember(email, role);
      setInviteToken(result.token);
      setEmail("");
      toast.success("Invitation created");
    } catch (error: any) {
      toast.error(error.message || "Could not create invitation");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#FF5500]">Organization workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Team</h1>
        <p className="mt-2 text-sm text-gray-400">Coordinate recruiting work with the right access for every teammate.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-white">Members</h2>
          {loading ? <p className="mt-6 text-sm text-gray-500">Loading team...</p> : (
            <div className="mt-4 divide-y divide-white/[0.06]">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{member.email}</p><p className="mt-1 text-xs text-gray-500">{member.company_name}</p></div>
                  <span className="rounded-full border border-[#FF5500]/25 bg-[#FF5500]/10 px-2.5 py-1 text-xs capitalize text-[#FF8a55]">{member.role.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-base font-semibold text-white">Invite teammate</h2>
          <form onSubmit={invite} className="mt-4 space-y-4">
            <label className="block text-sm text-gray-300">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-[var(--radius-control)] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-white outline-none focus:border-[#FF5500]" placeholder="teammate@company.com" /></label>
            <label className="block text-sm text-gray-300">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 w-full rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2.5 text-white outline-none focus:border-[#FF5500]">{roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></label>
            <Button type="submit" className="w-full">Create invitation</Button>
          </form>
          {inviteToken && <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3"><p className="text-xs font-medium text-emerald-300">Local invitation token</p><code className="mt-2 block break-all text-xs text-emerald-100">{inviteToken}</code></div>}
        </Card>
      </div>
    </main>
  );
}
