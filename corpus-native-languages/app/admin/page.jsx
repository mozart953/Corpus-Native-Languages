"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import AdminDashboard from "@/components/Admin/AdminDashboard.jsx";
import { useI18n } from "@/lib/i18n";

export default function AdminPage() {
  const { t } = useI18n();

  return (
    <RolePage
      activePath="/admin"
      eyebrow={t("admin.eyebrow")}
      title={t("admin.title")}
      subtitle={t("admin.subtitle")}
      allowedRoles={["admin"]}
    >
      {(user) => <AdminDashboard user={user} />}
    </RolePage>
  );
}
