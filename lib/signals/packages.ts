import prisma from '../prisma';

export interface PackageSignals {
  ecosystem: "npm" | "pypi"
  name: string
  weeklyDownloads: number
  monthlyDownloads: number
  description: string | null
  githubUrl: string | null
  version: string | null
}

export interface SignalError {
  error: true
  message: string
  code: "NOT_FOUND" | "RATE_LIMITED" | "INVALID_INPUT" | "UNKNOWN"
}

export async function fetchPackageSignals(
  packageName: string,
  ecosystem: "npm" | "pypi"
): Promise<PackageSignals | SignalError> {
  try {
    if (!packageName) {
      return { error: true, message: "Package name is required", code: "INVALID_INPUT" };
    }

    const type = ecosystem === "npm" ? "NPM_PACKAGE" : "PYPI_PACKAGE";
    const identifier = packageName.toLowerCase();

    // Check cache
    try {
      const cached = await prisma.signalTarget.findUnique({
        where: {
          type_identifier: {
            type,
            identifier
          }
        }
      });

      if (cached && cached.lastFetched && cached.signalData) {
        const hoursSince = (Date.now() - cached.lastFetched.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const data = cached.signalData as any;
          // Handle aggregate signals if saved by the API route
          if (data.package && !data.error) {
            return data.package as PackageSignals;
          }
          return data as PackageSignals;
        }
      }
    } catch (err) {
      console.warn("DB Cache read failed, proceeding to fetch.");
    }

    let result: PackageSignals;

    if (ecosystem === "npm") {
      const [weeklyRes, monthlyRes, packageRes] = await Promise.all([
        fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`),
        fetch(`https://api.npmjs.org/downloads/point/last-month/${packageName}`),
        fetch(`https://registry.npmjs.org/${packageName}`)
      ]);

      if (packageRes.status === 404) return { error: true, message: "Package not found", code: "NOT_FOUND" };
      if (packageRes.status === 429) return { error: true, message: "Rate limited", code: "RATE_LIMITED" };
      if (!packageRes.ok) return { error: true, message: `npm API error: ${packageRes.statusText}`, code: "UNKNOWN" };

      const weeklyData = await weeklyRes.json().catch(() => ({ downloads: 0 }));
      const monthlyData = await monthlyRes.json().catch(() => ({ downloads: 0 }));
      const packageData = await packageRes.json().catch(() => ({}));

      let githubUrl = packageData.repository?.url || null;
      if (githubUrl) {
        if (githubUrl.startsWith("git+")) githubUrl = githubUrl.slice(4);
        if (githubUrl.endsWith(".git")) githubUrl = githubUrl.slice(0, -4);
      }

      result = {
        ecosystem: "npm",
        name: packageName,
        weeklyDownloads: weeklyData.downloads || 0,
        monthlyDownloads: monthlyData.downloads || 0,
        description: packageData.description || null,
        githubUrl: githubUrl,
        version: packageData["dist-tags"]?.latest || null
      };

    } else if (ecosystem === "pypi") {
      const [statsRes, packageRes] = await Promise.all([
        fetch(`https://pypistats.org/api/packages/${packageName}/recent`),
        fetch(`https://pypi.org/pypi/${packageName}/json`)
      ]);

      if (packageRes.status === 404) return { error: true, message: "Package not found", code: "NOT_FOUND" };
      if (packageRes.status === 429 || statsRes.status === 429) return { error: true, message: "Rate limited", code: "RATE_LIMITED" };
      if (!packageRes.ok) return { error: true, message: `PyPI API error: ${packageRes.statusText}`, code: "UNKNOWN" };

      const statsData = statsRes.ok ? await statsRes.json().catch(() => ({ data: {} })) : { data: {} };
      const packageData = await packageRes.json().catch(() => ({ info: {} }));

      const info = packageData.info || {};
      let githubUrl = null;
      if (info.project_urls) {
        if (info.project_urls.Source && info.project_urls.Source.toLowerCase().includes("github")) {
          githubUrl = info.project_urls.Source;
        } else if (info.project_urls.Homepage && info.project_urls.Homepage.toLowerCase().includes("github")) {
          githubUrl = info.project_urls.Homepage;
        } else {
            for (const [key, url] of Object.entries(info.project_urls)) {
                if (typeof url === 'string' && url.toLowerCase().includes("github")) {
                    githubUrl = url;
                    break;
                }
            }
        }
      }

      result = {
        ecosystem: "pypi",
        name: packageName,
        weeklyDownloads: statsData.data?.last_week || 0,
        monthlyDownloads: statsData.data?.last_month || 0,
        description: info.summary || null,
        githubUrl: githubUrl,
        version: info.version || null
      };

    } else {
      return { error: true, message: "Invalid ecosystem", code: "INVALID_INPUT" };
    }

    // Upsert to Cache
    try {
      await prisma.signalTarget.upsert({
        where: {
          type_identifier: {
            type,
            identifier
          }
        },
        update: {
          displayName: result.name,
          signalData: result as any,
          lastFetched: new Date()
        },
        create: {
          type,
          identifier,
          displayName: result.name,
          signalData: result as any,
          lastFetched: new Date()
        }
      });
    } catch (err) {
      console.warn("DB Cache write failed.");
    }

    return result;

  } catch (error: any) {
    return { error: true, message: error.message || "Unknown error", code: "UNKNOWN" };
  }
}
