declare module '@docker/njs/profile-store.js' {
  interface ProfileStoreModule {
    buildProfileMetadata(
      content: string,
      stat: { mtimeMs: number; mtime: Date }
    ): {
      etag: string;
      lastModified: string;
    };
    isProfileFresh(
      request: {
        headersIn?: Record<string, string | undefined>;
      },
      metadata: {
        etag: string;
        lastModified: string;
      }
    ): boolean;
    readProfile(request: {
      headersIn?: Record<string, string | undefined>;
      headersOut: Record<string, string>;
      return: (status: number, body?: string) => void;
    }): void;
    writeProfile(request: {
      requestText?: string;
      headersOut: Record<string, string>;
      return: (status: number, body?: string) => void;
    }): void;
    deleteProfile(request: {
      headersOut: Record<string, string>;
      return: (status: number, body?: string) => void;
    }): void;
    handle(request: {
      method: string;
      headersIn?: Record<string, string | undefined>;
      headersOut: Record<string, string>;
      requestText?: string;
      return: (status: number, body?: string) => void;
    }): void;
    setProfileStoreFsForTests(mockFs: {
      statSync: (path: string) => { size?: number; mtimeMs: number; mtime: Date };
      readFileSync: (path: string, encoding: string) => string;
      writeFileSync: (path: string, content: string, encoding: string) => void;
      unlinkSync: (path: string) => void;
    }): void;
    resetProfileStoreFsForTests(): void;
  }

  const profileStore: ProfileStoreModule;
  export default profileStore;
}
