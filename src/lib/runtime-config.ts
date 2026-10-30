/** Written to /config.json by the AWS deployment, so the static site never needs rebuilding when the API changes. */
export interface RuntimeConfig {
  apiUrl: string;
  region: string;
  staffLogin: { domain: string; clientId: string };
}

let cached: Promise<RuntimeConfig> | undefined;

export function getRuntimeConfig(): Promise<RuntimeConfig> {
  cached ??= fetch('/config.json', { cache: 'no-store' }).then((res) => {
    if (!res.ok) throw new Error('Site configuration is missing');
    return res.json() as Promise<RuntimeConfig>;
  });
  return cached;
}
