export function isDevAuthEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return (
    process.env.DEV_AUTH === "true" ||
    process.env.NEXT_PUBLIC_DEV_AUTH === "true"
  );
}
