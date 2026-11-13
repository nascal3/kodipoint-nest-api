export function generateStubName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}