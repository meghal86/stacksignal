export type BuildRoomTabStatus = "ready" | "generating" | "locked" | "awaiting_approval";

export type BuildRoomTabs = {
  blueprint: BuildRoomTabStatus;
  buildTasks: BuildRoomTabStatus;
  launch: BuildRoomTabStatus;
  financials: BuildRoomTabStatus;
};

export type BusinessModel = "SaaS" | "Agency" | "API" | "Template" | "DataProduct";

export type BuildRoomOpportunity = {
  name?: string;
  category?: string;
  oneLiner?: string;
  targetCustomer?: string;
  roughPricing?: string;
  buildWeeks?: number;
  skipRisk?: string;
  signalEvidence?: string[];
};

export type BlueprintArchitecture = {
  frontend?: string;
  backend?: string;
  database?: string;
  jobs?: string;
  email?: string;
  payments?: string;
  deployment?: string;
  [key: string]: string | undefined;
};

export type ApiMapItem = {
  route?: string;
  path?: string;
  method: string;
  purpose?: string;
  description?: string;
  auth?: boolean;
};

export type StackRecommendation = {
  category: string;
  winner?: string;
  tool?: string;
  whyForThisOpp?: string;
  vsAlternative?: string;
  affiliateUrl?: string;
};

export type AgentTask = {
  id?: string;
  title: string;
  description: string;
  claudeCodePrompt?: string;
  estimatedMinutes?: number;
  dependsOn?: string[];
};

export type FounderTask = {
  id?: string;
  title: string;
  description: string;
  whyHuman?: string;
  estimatedMinutes?: number;
};

export type LaunchPost =
  | { platform: "HackerNews"; title: string; body: string }
  | { platform: "Reddit"; subreddit?: string; title: string; body: string }
  | { platform: "IndieHackers"; title: string; body: string }
  | { platform: "Twitter"; thread: string[] }
  | { platform: "LinkedIn"; post: string }
  | { platform: string; title?: string; body?: string; post?: string; thread?: string[]; content?: string };

export type LandingCopy = {
  headline?: string;
  subheadline?: string;
  heroCTA?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  cta?: string;
  featureBlocks?: Array<{ title: string; description: string }>;
  features?: string[];
  pricingSection?: {
    description?: string;
    tiers?: Array<{ name: string; price: string; features: string[] }>;
  };
  socialProof?: string;
};

export type LaunchAssets = {
  landingCopy?: LandingCopy;
  launchPosts?: LaunchPost[];
  waitlistOffer?: {
    headline?: string;
    incentive?: string;
    ctaText?: string;
  };
  firstProspects?: {
    profileDescription?: string;
    whereToFind?: string[];
    outreachTemplate?: string;
  };
};

export type FinancialModel = {
  buildCostComponents?: Array<{ name: string; estimatedHours: number; description: string }>;
  totalBuildHours?: number;
  monthlyFixedCosts?: Array<{ tool: string; cost: number; tier?: string; required?: boolean; affiliateUrl?: string }>;
  totalMonthlyFixed?: number;
  variableCostPerCustomer?: number;
  variableCostExplanation?: string;
  suggestedPricing?: {
    starter?: { price: number; reasoning?: string };
    growth?: { price: number; reasoning?: string };
    scale?: { price: number; reasoning?: string };
  };
  breakEvenCustomers?: number;
  breakEvenMonth?: number;
  scenarios?: {
    conservative?: { assumption?: string; month3MRR?: number; month6MRR?: number; month12MRR?: number };
    realistic?: { assumption?: string; month3MRR?: number; month6MRR?: number; month12MRR?: number };
    optimistic?: { assumption?: string; month3MRR?: number; month6MRR?: number; month12MRR?: number };
  };
  burn?: number;
  targetMrr?: number;
  breakevenMonths?: number;
  revenueStreams?: string[];
  projections?: number[];
};

export type BuildRoomContent = {
  id: string;
  analysisId: string;
  selectedIdea: BuildRoomOpportunity;
  businessModel?: string | null;
  productSpec?: string | null;
  architecture?: BlueprintArchitecture | null;
  prismaSchema?: string | null;
  apiMap?: ApiMapItem[] | null;
  stackRecs?: StackRecommendation[] | null;
  agentTasks?: AgentTask[] | null;
  founderTasks?: FounderTask[] | null;
  landingCopy?: LaunchAssets | LandingCopy | null;
  launchPosts?: LaunchPost[] | null;
  prospectList?: string[] | null;
  financialModel?: FinancialModel | null;
  blueprintApproved: boolean;
  launchApproved: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  analysis?: {
    id: string;
    rawInput: string;
    verdict?: "BUILD" | "WATCH" | "SKIP" | null;
    confidence?: number | null;
    verdictReasoning?: string | null;
    skipReasons?: unknown;
    demandScore?: number | null;
    founderFitScore?: number | null;
    crowdednessScore?: number | null;
    wtpScore?: number | null;
    gtmFitScore?: number | null;
    buildComplexity?: number | null;
    speedToRevenue?: number | null;
    moatScore?: number | null;
    platformRisk?: number | null;
    founderProfile?: unknown;
    topIdeas?: unknown;
  };
};

export type BuildRoomStatusResponse = {
  status: "not_started" | "generating" | "ready";
  buildRoomId?: string;
  tabs?: BuildRoomTabs;
  content?: BuildRoomContent;
  blueprintApproved?: boolean;
  launchApproved?: boolean;
};
