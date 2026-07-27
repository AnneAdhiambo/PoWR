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
  const [acceptToken, setAcceptToken] = useState("");

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

  async function changeRole(memberId: number, nextRole: string) {
    try {
      const result = await recruiterApiClient.updateTeamMember(memberId, nextRole);
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role: result.member.role } : member));
      toast.success("Role updated");
    } catch (error: any) { toast.error(error.message || "Could not update role"); }
  }

  async function removeMember(memberId: number) {
    if (!window.confirm("Remove this teammate from the organization?")) return;
    try {
      await recruiterApiClient.removeTeamMember(memberId);
      setMembers((current) => current.filter((member) => member.id !== memberId));
      toast.success("Teammate removed");
    } catch (error: any) { toast.error(error.message || "Could not remove teammate"); }
  }

  async function acceptInvitation(event: FormEvent) {
    event.preventDefault();
    try {
      await recruiterApiClient.acceptTeamInvitation(acceptToken);
      setAcceptToken("");
      toast.success("Invitation accepted");
      const result = await recruiterApiClient.getTeamMembers();
      setMembers(result.members);
    } catch (error: any) { toast.error(error.message || "Could not accept invitation"); }
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
                  <div className="flex items-center gap-2">
                    {member.role === "owner" ? <span className="rounded-full border border-[#FF5500]/25 bg-[#FF5500]/10 px-2.5 py-1 text-xs capitalize text-[#FF8a55]">Owner</span> : <>
                      <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => changeRole(member.id, event.target.value)} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-2 py-1.5 text-xs capitalize text-white outline-none focus:border-[#FF5500]">
                        {roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
                      </select>
                      <Button type="button" variant="ghost" onClick={() => removeMember(member.id)} className="px-2 text-xs text-red-300">Remove</Button>
                    </>}
                  </div>
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
          <div className="my-6 border-t border-white/[0.06]" />
          <h2 className="text-base font-semibold text-white">Accept invitation</h2>
          <p className="mt-1 text-xs text-gray-500">Use a token sent to your signed-in email.</p>
          <form onSubmit={acceptInvitation} className="mt-4 space-y-3">
            <input required value={acceptToken} onChange={(event) => setAcceptToken(event.target.value)} placeholder="Invitation token" className="w-full rounded-[var(--radius-control)] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#FF5500]" />
            <Button type="submit" variant="secondary" className="w-full">Join organization</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
