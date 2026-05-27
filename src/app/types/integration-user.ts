import type { HassUser } from 'home-assistant-js-websocket';

export interface IntegrationUser {
  id?: string;
  name: string;
  is_owner?: boolean;
  is_admin?: boolean;
  avatarUrl?: string | null;
  email?: string | null;
}

export function fromHassUser(user: HassUser | null | undefined): IntegrationUser | null {
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
