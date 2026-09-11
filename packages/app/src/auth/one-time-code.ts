export function formatOneTimeCode(value: string, maximumCharacters: number): string {
  const characters = value
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .slice(0, maximumCharacters);
  return characters.match(/.{1,4}/g)?.join('-') ?? '';
}
