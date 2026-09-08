declare module '@docker/njs/rss-proxy.js' {
  const rssProxy: {
    handleIngress(request: {
      args: { url?: string };
      variables: { args?: string };
      headersOut: Record<string, string>;
      return(status: number, body: string): void;
      subrequest(
        path: string,
        options: { method: string; body: string }
      ): Promise<{ status: number; headersOut: Record<string, string>; responseText: string }>;
    }): Promise<void>;
    handle(request: {
      args: { url?: string };
      variables: { args?: string };
      headersOut: Record<string, string>;
      return(status: number, body: string): void;
      subrequest(
        path: string,
        options: { method: string; body: string }
      ): Promise<{ status: number; headersOut: Record<string, string>; responseText: string }>;
    }): Promise<void>;
  };
  export default rssProxy;
}
