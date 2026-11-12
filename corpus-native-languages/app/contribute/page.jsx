"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import ContributeDashboard from "@/components/Contribute/ContributeDashboard.jsx";
import { useI18n } from "@/lib/i18n";

export default function ContributePage() {
  const { t } = useI18n();

  return (
    <RolePage
      activePath="/contribute"
      eyebrow={t("contribute.eyebrow")}
      title={t("contribute.title")}
      subtitle={t("contribute.subtitle")}
      allowedRoles={["contributor", "reviewer", "admin"]}
    >
      {(user) => <ContributeDashboard user={user} />}
    </RolePage>
  );
}
