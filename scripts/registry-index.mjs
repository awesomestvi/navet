// Keep search/lightweight browser responses small. Source and full contracts live
// at each item endpoint; recipe payloads retain their existing index contract.
export function indexItem(item) {
  if (!item.meta?.catalogKind) return item;
  const { name, type, title, description, categories } = item;
  const { catalogKind, level, reviewStatus, owner, source, states, story, reference, sourceRevision, renderedFingerprint, sourceFingerprint, templateFingerprint, contractFingerprint, storyFingerprint, compositionFingerprint } = item.meta;
  return { name, type, title, description, categories, meta: { catalogKind, level, reviewStatus, owner, source, states, story, reference, sourceRevision, renderedFingerprint, sourceFingerprint, templateFingerprint, contractFingerprint, storyFingerprint, compositionFingerprint } };
}
