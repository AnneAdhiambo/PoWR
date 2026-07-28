"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, RecruiterPage, controlClassName } from "../../components/ui";
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
  employment_type?: string;
  department?: string;
  manager_name?: string;
  onboarding_notes?: string;
}

export default function RecruiterEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    recruiterApiClient.getEmployees()
      .then(({ employees: rows }) => setEmployees(rows))
      .catch((loadError) => setError(loadError.message || "Could not load employees"))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(employee: Employee, employmentStatus: string) {
    try {
      const { employee: updated } = await recruiterApiClient.updateEmployee(employee.id, { employment_status: employmentStatus });
      setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, ...updated } : item));
      toast.success("Onboarding status updated");
    } catch (error: any) { toast.error(error.message || "Could not update employee"); }
  }

  return (
    <RecruiterPage>
      <PageHeader eyebrow="People operations" title="Employees" description="Carry successful candidates into a structured onboarding handoff." />

      {error ? <ErrorState description={error} /> : loading ? <LoadingState label="Loading employee handoffs" /> : employees.length === 0 ? (
        <EmptyState title="No employee records yet" description="Move an application to Hired, then create its employee onboarding record." />
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
                <select aria-label={`Onboarding status for ${employee.developer_username}`} value={employee.employment_status} onChange={(event) => updateStatus(employee, event.target.value)} className={`${controlClassName} w-auto py-1.5 text-xs capitalize text-emerald-300`}>
                  {["onboarding", "ready", "active", "paused", "offboarded"].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-gray-500 sm:grid-cols-3">
                <p>Type: <span className="text-gray-300">{employee.employment_type || "Not set"}</span></p>
                <p>Department: <span className="text-gray-300">{employee.department || "Not set"}</span></p>
                <p>Manager: <span className="text-gray-300">{employee.manager_name || "Not set"}</span></p>
              </div>
              {employee.onboarding_notes && <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm text-gray-400">{employee.onboarding_notes}</p>}
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
                <div><p className="text-lg font-semibold text-white">{employee.powr_score}</p><p className="text-[11px] text-gray-600">PoWR score</p></div>
                <div><p className="text-sm font-medium text-white">{employee.start_date ? new Date(employee.start_date).toLocaleDateString() : "Not set"}</p><p className="text-[11px] text-gray-600">Start date</p></div>
                <div><p className="text-sm font-medium text-white">{new Date(employee.created_at).toLocaleDateString()}</p><p className="text-[11px] text-gray-600">Record created</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </RecruiterPage>
  );
}
