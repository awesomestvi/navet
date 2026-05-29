export interface IntegrationUser {
  id?: string;
  name: string;
  is_owner?: boolean;
  is_admin?: boolean;
  avatarUrl?: string | null;
  email?: string | null;
}

interface HomeAssistantUserLike {
  id?: string;
  name?: string | null;
  is_owner?: boolean;
  is_admin?: boolean;
}

export function fromHassUser(
  user: HomeAssistantUserLike | null | undefined
): IntegrationUser | null {
  if (!user?.name) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    is_owner: user.is_owner,
    is_admin: user.is_admin,
  };
}
