"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card, ConfirmDialog, EmptyState, Field, LoadingState, PageHeader, RecruiterPage, StatusBadge, controlClassName } from "../../components/ui";
import { useRecruiterContext } from "../../components/recruiter/RecruiterContext";
import { recruiterApiClient } from "../../lib/recruiterApi";

const roles = ["admin", "recruiter", "hiring_manager", "interviewer"];

export default function RecruiterTeamPage() {
  const { canManageOrganization, role: organizationRole } = useRecruiterContext();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [loading, setLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<any | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    recruiterApiClient.getTeamMembers().then((result) => setMembers(result.members)).catch(() => toast.error("Could not load team")).finally(() => setLoading(false));
  }, [router]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!canManageOrganization) return;
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
    if (!canManageOrganization) return;
    try {
      const result = await recruiterApiClient.updateTeamMember(memberId, nextRole);
      setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role: result.member.role } : member));
      toast.success("Role updated");
    } catch (error: any) { toast.error(error.message || "Could not update role"); }
  }

  async function removeMember(memberId: number) {
    if (!canManageOrganization) return;
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
    <RecruiterPage className="max-w-5xl">
      <PageHeader eyebrow="Organization workspace" title="Team" description="Coordinate recruiting work with the right access for every teammate." />
      {!canManageOrganization && <Card className="mb-6 border-blue-500/20 bg-blue-500/[0.05] p-4"><p className="text-sm text-blue-100">You have {organizationRole?.replace("_", " ") || "member"} access. Only organization owners and admins can invite teammates or change access.</p></Card>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-white">Members</h2>
          {loading ? <div className="mt-4"><LoadingState label="Loading team" /></div> : members.length === 0 ? (
            <div className="mt-4"><EmptyState title="No teammates yet" description="Invite a teammate to collaborate on jobs and hiring decisions." /></div>
          ) : (
            <div className="mt-4 divide-y divide-white/[0.06]">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{member.email}</p><p className="mt-1 text-xs text-gray-500">{member.company_name}</p></div>
                  <div className="flex items-center gap-2">
                    {member.role === "owner" || !canManageOrganization ? <StatusBadge tone={member.role === "owner" ? "brand" : "neutral"}>{member.role.replace("_", " ")}</StatusBadge> : <>
                      <select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => changeRole(member.id, event.target.value)} className={`${controlClassName} w-auto py-1.5 text-xs capitalize`}>
                        {roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
                      </select>
                      <Button type="button" variant="ghost" onClick={() => setMemberPendingRemoval(member)} className="px-2 text-xs text-red-300">Remove</Button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5">
          {canManageOrganization && <><h2 className="text-base font-semibold text-white">Invite teammate</h2>
            <form onSubmit={invite} className="mt-4 space-y-4">
              <Field label="Email" required><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={controlClassName} placeholder="teammate@company.com" /></Field>
              <Field label="Role"><select value={role} onChange={(event) => setRole(event.target.value)} className={controlClassName}>{roles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select></Field>
              <Button type="submit" className="w-full">Create invitation</Button>
            </form>
            {inviteToken && <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3"><p className="text-xs font-medium text-emerald-300">Local invitation token</p><code className="mt-2 block break-all text-xs text-emerald-100">{inviteToken}</code></div>}
            <div className="my-6 border-t border-white/[0.06]" /></>}
          <h2 className="text-base font-semibold text-white">Accept invitation</h2>
          <p className="mt-1 text-xs text-gray-500">Use a token sent to your signed-in email.</p>
          <form onSubmit={acceptInvitation} className="mt-4 space-y-3">
            <Field label="Invitation token"><input required value={acceptToken} onChange={(event) => setAcceptToken(event.target.value)} placeholder="Paste token" className={controlClassName} /></Field>
            <Button type="submit" variant="secondary" className="w-full">Join organization</Button>
          </form>
        </Card>
      </div>
      <ConfirmDialog isOpen={Boolean(memberPendingRemoval)} onClose={() => setMemberPendingRemoval(null)} onConfirm={() => memberPendingRemoval && removeMember(memberPendingRemoval.id)} title="Remove teammate?" message={`${memberPendingRemoval?.email || "This teammate"} will lose access to this organization workspace.`} confirmText="Remove teammate" variant="danger" />
    </RecruiterPage>
  );
}
