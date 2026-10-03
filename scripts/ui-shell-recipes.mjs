// Recognize the existing forbidden shell signatures regardless of utility order.
// This is a lexical guard, not a general detector of equivalent CSS or JSX composition.
export function hasLegacyModalRecipe(source) {
  const literals = source.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|(["'`])((?:\\[\s\S]|(?!\1)[\s\S])*?)\1/g);
  for (const [, , value] of literals) {
    if (value === undefined) continue;
    const classes = new Set(value.split(/\s+/));
    const includes = (...required) => required.every((name) => classes.has(name));
    if (includes('fixed', 'z-50', 'shadow-2xl') && (
      includes('left-1/2', 'top-1/2', 'backdrop-blur-xl') ||
      includes('inset-x-0', 'bottom-0', 'rounded-[30px]')
    )) return true;
  }
  return false;
}
