"use client";

import { useEffect } from "react";
import { markNotificationsSeen } from "./NotificationBell";

// Opening the notifications page is what "reading" means — this stamps the
// newest item's timestamp so NotificationBell's badge clears.
export default function MarkNotificationsSeen({ newestAt }: { newestAt: string | null }) {
  useEffect(() => {
    if (newestAt) markNotificationsSeen(newestAt);
  }, [newestAt]);

  return null;
}
