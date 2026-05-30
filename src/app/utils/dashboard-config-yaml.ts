export async function stringifyDashboardConfigYaml(value: unknown) {
  const { stringify } = await import('yaml');
  return stringify(value);
}

export async function parseDashboardConfigYaml(content: string) {
  const { parse } = await import('yaml');
  return parse(content);
}
