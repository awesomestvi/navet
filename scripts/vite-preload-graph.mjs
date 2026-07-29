function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readDependencyTable(source) {
  const tableMatch = source.match(/m\.f\|\|\(m\.f=(\[[\s\S]*?\])\)\)\)=>/);
  if (!tableMatch?.[1]) {
    throw new Error('Unable to find the Vite dynamic preload dependency table');
  }

  const table = JSON.parse(tableMatch[1]);
  if (!Array.isArray(table) || !table.every((entry) => typeof entry === 'string')) {
    throw new Error('Vite dynamic preload dependency table has an unexpected shape');
  }

  return table;
}

export function readViteDynamicPreloadAssetPaths(source, chunkPrefix) {
  const importPattern = new RegExp(
    `import\\([\\\`'"]\\.\\/(${escapeRegExp(chunkPrefix)}[^\\\`'"]+\\.js)[\\\`'"]\\)`
  );
  const importMatch = importPattern.exec(source);
  if (!importMatch?.[1] || importMatch.index === undefined) {
    throw new Error(`Unable to find the ${chunkPrefix} dynamic import`);
  }

  const preloadCallSource = source.slice(importMatch.index, importMatch.index + 4096);
  const preloadMatch = preloadCallSource.match(/__vite__mapDeps\(\[([0-9,\s]+)\]\)/);
  if (!preloadMatch?.[1]) {
    throw new Error(`Unable to find the ${chunkPrefix} dynamic preload dependency indexes`);
  }

  const dependencyTable = readDependencyTable(source);
  const dependencyIndexes = preloadMatch[1].split(',').map((value) => Number(value.trim()));
  if (
    dependencyIndexes.length === 0 ||
    dependencyIndexes.some(
      (index) => !Number.isInteger(index) || index < 0 || index >= dependencyTable.length
    )
  ) {
    throw new Error(`${chunkPrefix} dynamic preload dependency indexes are invalid`);
  }

  const targetAssetPath = importMatch[1];
  const assetPaths = dependencyIndexes.map((index) =>
    dependencyTable[index].replace(/^\.\//, '')
  );
  if (!assetPaths.includes(targetAssetPath)) {
    throw new Error(`${chunkPrefix} dynamic preload graph does not include its target chunk`);
  }

  return {
    assetPaths,
    targetAssetPath,
  };
}
