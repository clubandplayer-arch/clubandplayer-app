export function getRoleChangeRequestProfilePath(
  accountType: string | null | undefined,
  profileId: string,
): string | null {
  switch (accountType) {
    case "athlete":
    case "staff":
      return `/players/${profileId}`;
    case "club":
      return `/clubs/${profileId}`;
    case "institution":
      return `/institutions/${profileId}`;
    default:
      return null;
  }
}
