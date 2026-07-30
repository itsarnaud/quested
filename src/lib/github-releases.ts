const REPO = "itsarnaud/quested";

export type GithubRelease = {
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
};

// Cached for an hour — release notes don't need to be real-time, and this
// keeps us well under GitHub's unauthenticated rate limit.
export async function fetchReleases(): Promise<GithubRelease[]> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases`, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const releases = (await res.json()) as {
    tag_name: string;
    name: string | null;
    body: string | null;
    published_at: string | null;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
  }[];

  return releases
    .filter((r) => !r.draft)
    .map((r) => ({
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      body: r.body ?? "",
      publishedAt: r.published_at ?? "",
      htmlUrl: r.html_url,
    }));
}

export async function getLatestVersion(): Promise<string | null> {
  const releases = await fetchReleases();
  return releases[0]?.tagName ?? null;
}
