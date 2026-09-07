type NormalizedJson = null | boolean | number | string | NormalizedJson[] | { [key: string]: NormalizedJson };

function normalize(value: unknown): NormalizedJson {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, NormalizedJson>>((acc, key) => {
        const child = record[key];
        if (child !== undefined) {
          acc[key] = normalize(child);
        }
        return acc;
      }, {});
  }

  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  throw new TypeError(`Unsupported JSON value: ${typeof value}`);
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}
