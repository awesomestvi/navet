declare module '@docker/njs/profile-store.js' {
  interface NjsProfileRequest {
    method: string;
    uri?: string;
    headersIn?: Record<string, string | undefined>;
    headersOut: Record<string, string>;
    requestText?: string;
    return: (status: number, body?: string) => void;
  }

  interface ProfileStoreModule {
    buildProfileMetadata(
      workspace: { workspaceId: string; createdAt: string },
      state: {
        revision: number;
        metadata: { updatedAt: string } | null;
      }
    ): {
      etag: string;
      lastModified: string;
    };
    createProfileGeneration(): string;
    isProfileFresh(
      request: {
        headersIn?: Record<string, string | undefined>;
      },
      metadata: {
        etag: string;
        lastModified: string;
      }
    ): boolean;
    handle(request: NjsProfileRequest): void;
    handleIngress(request: NjsProfileRequest): void;
    routeRequest(
      request: NjsProfileRequest,
      principal: {
        providerId: string;
        tenantId: string;
        sessionId: string;
        userId: string | null;
        userName: string | null;
      }
    ): void;
    setProfileStoreFsForTests(mockFs: {
      statSync: (path: string) => { size?: number; mtimeMs: number; mtime: Date };
      readFileSync: (path: string, encoding: string) => string;
      writeFileSync: (path: string, content: string, encoding: string) => void;
      renameSync: (sourcePath: string, destinationPath: string) => void;
      unlinkSync: (path: string) => void;
    }): void;
    setProfileStorePrincipalResolverForTests(
      resolver: (
        request: NjsProfileRequest,
        options: { trustIngressHeaders: boolean }
      ) => {
        providerId: string;
        tenantId: string;
        sessionId: string;
        userId: string | null;
        userName: string | null;
      } | null
    ): void;
    resetProfileStoreFsForTests(): void;
  }

  const profileStore: ProfileStoreModule;
  export default profileStore;
}
