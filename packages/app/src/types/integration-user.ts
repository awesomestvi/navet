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
  avatarUrl?: string | null;
  avatar_url?: string | null;
  picture?: string | null;
  image?: string | null;
}

function resolveHomeAssistantAvatarUrl(user: HomeAssistantUserLike): string | null {
  const candidates = [user.avatarUrl, user.avatar_url, user.picture, user.image];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
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
    avatarUrl: resolveHomeAssistantAvatarUrl(user),
  };
}
