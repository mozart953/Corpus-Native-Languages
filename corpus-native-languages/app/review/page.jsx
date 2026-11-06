"use client";

import RolePage from "@/components/RolePage/RolePage.jsx";
import ReviewDashboard from "@/components/Review/ReviewDashboard.jsx";

export default function ReviewPage() {
  return (
    <RolePage
      activePath="/review"
      eyebrow="Review desk"
      title="Moderate the corpus"
      subtitle="Review submitted words and languages, recommend approval or rejection, and raise removal requests. An admin gives the final approval."
      allowedRoles={["reviewer", "admin"]}
    >
      {(user) => <ReviewDashboard user={user} />}
    </RolePage>
  );
}
