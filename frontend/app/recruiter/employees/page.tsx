"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

interface Employee {
  id: number;
  developer_username: string;
  work_email: string;
  job_title: string;
  employment_status: string;
  start_date?: string;
  powr_score: number;
  created_at: string;
}

export default function RecruiterEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    recruiterApiClient.getEmployees()
      .then(({ employees: rows }) => setEmployees(rows))
      .catch((error) => toast.error(error.message || "Could not load employees"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-[#FF5500]">People operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Employees</h1>
        <p className="mt-2 text-sm text-gray-400">Continue onboarding after a successful hiring decision.</p>
      </div>

      {loading ? <Card className="p-8 text-sm text-gray-400">Loading employees...</Card> : employees.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-base font-medium text-white">No employee records yet</p>
          <p className="mt-2 text-sm text-gray-500">Move an application to Hired, then create its employee record.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {employees.map((employee) => (
            <Card key={employee.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-white">@{employee.developer_username}</h2>
                  <p className="mt-1 text-sm text-gray-400">{employee.job_title}</p>
                  <p className="mt-1 text-xs text-gray-600">{employee.work_email}</p>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs capitalize text-emerald-300">{employee.employment_status}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                <div><p className="text-lg font-semibold text-white">{employee.powr_score}</p><p className="text-[11px] text-gray-600">PoWR score</p></div>
                <div><p className="text-sm font-medium text-white">{employee.start_date ? new Date(employee.start_date).toLocaleDateString() : "Not set"}</p><p className="text-[11px] text-gray-600">Start date</p></div>
                <div><p className="text-sm font-medium text-white">{new Date(employee.created_at).toLocaleDateString()}</p><p className="text-[11px] text-gray-600">Record created</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
