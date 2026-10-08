import recipes from './recipes.json';
export function recipeDescription(name: string) {
  const recipe = recipes.find((recipe) => recipe.name === name);
  return {
    docs: { description: { story: `${recipe?.description} Reference: ${recipe?.reference}` } },
  };
}
