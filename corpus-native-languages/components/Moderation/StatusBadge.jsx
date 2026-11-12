"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "../../lib/i18n";
import "./StatusBadge.css";

const LABELS = {
  draft: "Draft",
  pending: "Pending review",
  reviewer_approved: "Reviewer approved",
  approved: "Published",
  rejected: "Rejected",
  removed: "Removed",
  active: "Active",
  deactivated: "Deactivated",
  rejected_account: "Rejected",
};

const TONES = {
  draft: "neutral",
  pending: "warning",
  reviewer_approved: "info",
  approved: "success",
  rejected: "danger",
  removed: "danger",
  active: "success",
  deactivated: "warning",
};

/** Small, consistent state chip used by every role dashboard. */
export default function StatusBadge({ state = "unknown", label = null }) {
  const { t, has } = useI18n();
  const key = `status.${state}`;

  return (
    <Badge
      variant="outline"
      className={`statusBadge statusBadge--${TONES[state] ?? "neutral"}`}
    >
      {label ?? (has(key) ? t(key) : LABELS[state] ?? state)}
    </Badge>
  );
}
