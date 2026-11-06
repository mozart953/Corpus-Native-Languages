"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import AdminDashboard from "@/components/Admin/AdminDashboard.jsx";

export default function AdminPage() {
  return (
    <RolePage
      activePath="/admin"
      eyebrow="Administration"
      title="Accounts, approvals and the archive"
      subtitle="Approve new contributors and reviewers, manage active accounts, and keep removed content retained but hidden from the public corpus."
      allowedRoles={["admin"]}
    >
      {(user) => <AdminDashboard user={user} />}
    </RolePage>
  );
}
