"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import ReviewDashboard from "@/components/Review/ReviewDashboard.jsx";
import { useI18n } from "@/lib/i18n";

export default function ReviewPage() {
  const { t } = useI18n();

  return (
    <RolePage
      activePath="/review"
      eyebrow={t("review.eyebrow")}
      title={t("review.title")}
      subtitle={t("review.subtitle")}
      allowedRoles={["reviewer", "admin"]}
    >
      {(user) => <ReviewDashboard user={user} />}
    </RolePage>
  );
}
