export type AnalysisInputType =
  | "github_repo"
  | "npm_package"
  | "pypi_package"
  | "domain_search";

export function detectAnalysisInputType(input: string): AnalysisInputType {
  const value = input.trim();

  if (
    value.includes("github.com") ||
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)
  ) {
    return "github_repo";
  }

  if (value.startsWith("@")) {
    return "npm_package";
  }

  if (value.includes("pypi.org")) {
    return "pypi_package";
  }

  return "domain_search";
}

export function normalizeAnalysisInput(
  input: string,
  inputType: AnalysisInputType
): string {
  const value = input.trim();

  if (inputType === "github_repo") {
    const match = value.match(/github\.com\/([^/?#]+\/[^/?#]+)/);
    if (match) {
      return match[1].replace(/\.git$/, "");
    }

    return value.replace(/^https?:\/\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  }

  if (inputType === "pypi_package") {
    const match = value.match(/pypi\.org\/project\/([^/?#]+)/);
    if (match) {
      return match[1];
    }
  }

  return value;
}
