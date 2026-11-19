"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import AccountDashboard from "@/components/Account/AccountDashboard.jsx";
import { useI18n } from "@/lib/i18n";

export default function AccountPage() {
  const { t } = useI18n();

  return (
    <RolePage
      activePath="/account"
      eyebrow={t("account.eyebrow")}
      title={t("account.title")}
      subtitle={t("account.subtitle")}
    >
      {(_user, auth) => (
        <AccountDashboard onProfileChanged={auth?.refreshProfile} />
      )}
    </RolePage>
  );
}
