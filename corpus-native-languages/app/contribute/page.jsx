"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import ContributeDashboard from "@/components/Contribute/ContributeDashboard.jsx";

export default function ContributePage() {
  return (
    <RolePage
      activePath="/contribute"
      eyebrow="Contribution desk"
      title="Add and manage your entries"
      subtitle="Create words and languages, keep private drafts, submit them for review, and restore anything you discard before submitting."
      allowedRoles={["contributor", "reviewer", "admin"]}
    >
      {(user) => <ContributeDashboard user={user} />}
    </RolePage>
  );
}
