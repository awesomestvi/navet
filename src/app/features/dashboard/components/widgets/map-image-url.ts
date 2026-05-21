export function getCompactHomeAssistantImageUrl(resourceUrl: string) {
  return resourceUrl.replace(
    /\/api\/image\/serve\/([^/?#]+)\/512x512(?=([?#]|$))/,
    '/api/image/serve/$1/96x96'
  );
}
