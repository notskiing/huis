export const spartaStatus = process.env.SPARTA_ENABLED === "true"
  ? "Sparta: CONFIGURED (runner requires documented participant world)"
  : "Sparta: SKIPPED (participant build and supported connector not configured)";
