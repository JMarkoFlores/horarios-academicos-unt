export class CacheKeyRegistry {
  private static readonly keys = new Set<string>();

  static remember(key: string): void {
    this.keys.add(key);
  }

  static findByPrefix(prefix: string): string[] {
    return [...this.keys].filter((key) => key.startsWith(prefix));
  }

  static forget(key: string): void {
    this.keys.delete(key);
  }
}
