export function isProductionEnvironment(): boolean {
  return import.meta.env.PROD;
}
