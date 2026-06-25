export type WikipediaObjectType =
  | "star"
  | "planet"
  | "sun"
  | "moon"
  | "constellation";

const GREEK_LETTER_NAMES: Record<string, string> = {
  α: "Alpha",
  β: "Beta",
  γ: "Gamma",
  δ: "Delta",
  ε: "Epsilon",
  ζ: "Zeta",
  η: "Eta",
  θ: "Theta",
  ι: "Iota",
  κ: "Kappa",
  λ: "Lambda",
  μ: "Mu",
  ν: "Nu",
  ξ: "Xi",
  ο: "Omicron",
  π: "Pi",
  ρ: "Rho",
  σ: "Sigma",
  τ: "Tau",
  υ: "Upsilon",
  φ: "Phi",
  χ: "Chi",
  ψ: "Psi",
  ω: "Omega",
};

const SOLAR_SYSTEM_TITLES: Record<string, string> = {
  Sun: "Sun",
  Moon: "Moon",
  Mercury: "Mercury (planet)",
  Venus: "Venus",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
};

function expandGreekLetter(name: string): string {
  const match = name.match(/^(\S+)\s+(.+)$/);
  if (!match) {
    return name;
  }

  const [, letter, rest] = match;
  const expanded = GREEK_LETTER_NAMES[letter];
  if (!expanded) {
    return name;
  }

  return `${expanded} ${rest}`;
}

function getSearchQuery(name: string, type: WikipediaObjectType): string {
  if (type === "constellation") {
    return `${name} (constellation)`;
  }

  if (type === "sun" || type === "moon" || type === "planet") {
    return SOLAR_SYSTEM_TITLES[name] ?? name;
  }

  return expandGreekLetter(name);
}

export function getWikipediaUrl(
  name: string,
  type: WikipediaObjectType,
): string {
  const searchQuery = getSearchQuery(name, type);
  const encoded = encodeURIComponent(searchQuery);
  return `https://en.wikipedia.org/w/index.php?title=Special:Search&search=${encoded}&go=Go`;
}
