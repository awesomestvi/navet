function humanizeLabel(label: string) {
  return label
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function tokenizeLabel(label: string) {
  return humanizeLabel(label)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function getSharedPrefixWords(primaryLabel: string, siblingLabels: readonly string[]) {
  const primaryWords = tokenizeLabel(primaryLabel);
  if (primaryWords.length === 0) {
    return [];
  }

  let bestPrefix: string[] = [];

  for (const siblingLabel of siblingLabels) {
    const siblingWords = tokenizeLabel(siblingLabel);
    const sharedPrefix: string[] = [];
    const maxLength = Math.min(primaryWords.length, siblingWords.length);

    for (let index = 0; index < maxLength; index += 1) {
      if (primaryWords[index] !== siblingWords[index]) {
        break;
      }

      sharedPrefix.push(primaryWords[index]);
    }

    if (sharedPrefix.length > bestPrefix.length) {
      bestPrefix = sharedPrefix;
    }
  }

  return bestPrefix;
}

function getSharedPrefixWordsFromLabels(labels: readonly string[]) {
  if (labels.length < 2) {
    return [];
  }

  const tokenizedLabels = labels.map(tokenizeLabel).filter((tokens) => tokens.length > 0);
  if (tokenizedLabels.length < 2) {
    return [];
  }

  const [firstLabelWords, ...remainingLabelWords] = tokenizedLabels;
  const sharedPrefix: string[] = [];

  for (let index = 0; index < firstLabelWords.length; index += 1) {
    const candidateWord = firstLabelWords[index];
    if (!remainingLabelWords.every((labelWords) => labelWords[index] === candidateWord)) {
      break;
    }

    sharedPrefix.push(candidateWord);
  }

  return sharedPrefix;
}

function stripSharedPrefix(label: string, prefixWords: readonly string[]) {
  if (prefixWords.length === 0) {
    return label;
  }

  const humanizedLabel = humanizeLabel(label);
  const prefixText = humanizeLabel(prefixWords.join(' '));
  const prefixPattern = new RegExp(
    `^${prefixText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[\\s:/_-]+|(?=[A-Z][a-z])|$)`,
    'i'
  );
  const strippedLabel = humanizedLabel.replace(prefixPattern, '').trim();

  return strippedLabel.length > 0 ? strippedLabel : label;
}

export function compactRepeatedDeviceLabel(
  label: string,
  primaryLabel: string,
  siblingLabels: readonly string[]
) {
  const sharedPrefixWords = getSharedPrefixWords(primaryLabel, siblingLabels);
  return stripSharedPrefix(label, sharedPrefixWords);
}

export function compactRepeatedLabelGroup(label: string, relatedLabels: readonly string[]) {
  const sharedPrefixWords = getSharedPrefixWordsFromLabels(relatedLabels);
  return stripSharedPrefix(label, sharedPrefixWords);
}
