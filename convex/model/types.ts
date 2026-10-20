export const TASK_STATUSES = ["waiting", "todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const BOT_STATUSES = ["waiting", "active", "routine", "on-demand"] as const;
export type BotStatus = (typeof BOT_STATUSES)[number];

export const PROVIDERS = ["clickup", "github", "linear", "jira", "fleet"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const SYNC_PROVIDERS = ["clickup", "github", "linear", "jira"] as const;
export type SyncProvider = (typeof SYNC_PROVIDERS)[number];

export type Urgency = "high" | "normal";

export type FleetConfig = {
  org_map?: Record<string, string>;
  org_colours?: Record<string, string>;
  known_routines?: Record<string, string[]>;
  notes?: Record<string, string[]>;
  last_run?: Record<string, string>;
  role_override?: Record<string, string>;
};

export type FleetProfile = {
  name?: string;
  description?: string;
  avatarColor?: string;
  avatarShape?: string;
};

export type SnapshotTask = {
  key: string;
  title: string;
  status: TaskStatus;
  owner: string;
  org: string;
  urgency: Urgency;
  claimants: string[];
  source: string;
  externalId: string;
  url: string;
};

export type WaitingItem = {
  title: string;
  owner: string;
  date: string;
  source: string;
  urgency: Urgency;
  conflict: boolean;
  claimantKeys: string[];
  clusterId: string;
};

export type SnapshotBot = {
  key: string;
  name: string;
  description: string;
  role: string;
  org: string;
  orgColor: string;
  avatarColor: string;
  avatarShape: string;
  wake: string;
  routines: string[];
  lastRun: string;
  activity: string[];
  notes: string[];
  open: string[];
};

export type FleetSnapshot = {
  generatedAt: number;
  bots: SnapshotBot[];
  waiting: WaitingItem[];
  tasks: SnapshotTask[];
};

export type FleetDocuments = {
  config: FleetConfig;
  pending?: string;
  index?: string;
  profiles: FleetProfile[];
  files: Record<string, string>;
  tasks?: Partial<SnapshotTask>[];
};

export type BotRow = {
  key: string;
  name: string;
  description: string;
  role: string;
  org: string;
  orgColor: string;
  avatarColor: string;
  avatarShape: string;
  wake: string;
  lastRunText: string;
  openCount: number;
  openItems: string[];
  activity: string[];
  notes: string[];
  reportedStatus?: BotStatus;
  updatedAt: number;
};

export type RoutineRow = {
  key: string;
  botKey: string;
  name: string;
  updatedAt: number;
};

export type RunStatus = "ok" | "error" | "running" | "note";

export type RunRow = {
  key: string;
  botKey: string;
  summary: string;
  status: RunStatus;
  startedAt: number;
  finishedAt: number;
  updatedAt: number;
};

export type TaskRow = {
  key: string;
  title: string;
  status: TaskStatus;
  ownerBotKey: string;
  ownerLabel: string;
  org: string;
  orgColor: string;
  urgency: Urgency;
  claimKey: string;
  conflict: boolean;
  claimantKeys: string[];
  sourceKey: string;
  externalId: string;
  externalUrl: string;
  addedDate: string;
  updatedAt: number;
};

export type SourceRow = {
  key: string;
  provider: Provider;
  name: string;
  readOnly: boolean;
  updatedAt: number;
};

export type SyncLinkRow = {
  key: string;
  sourceKey: string;
  externalId: string;
  taskKey: string;
  url: string;
  lastSyncedAt: number;
};

export type IngestRunRow = {
  key: string;
  receivedAt: number;
  botCount: number;
  taskCount: number;
  status: "ok" | "error";
  message: string;
};

export type FleetState = {
  bots: BotRow[];
  routines: RoutineRow[];
  runs: RunRow[];
  tasks: TaskRow[];
  sources: SourceRow[];
  syncLinks: SyncLinkRow[];
  ingestRuns: IngestRunRow[];
};

export type RemoteTask = {
  externalId: string;
  title: string;
  url?: string;
  status: TaskStatus;
  org?: string;
  ownerBotKey?: string;
  ownerLabel?: string;
  urgency?: Urgency;
};

export type BotView = {
  key: string;
  name: string;
  org: string;
  orgColor: string;
  avatarColor: string;
  avatarShape: string;
  role: string;
  wake: string;
  routines: string[];
  lastRun: string;
  openCount: number;
  openItems: string[];
  activity: string[];
  notes: string[];
  status: BotStatus;
  currentWork: string;
};

export type TaskView = {
  key: string;
  title: string;
  status: TaskStatus;
  ownerBotKey?: string;
  ownerLabel: string;
  org: string;
  orgColor: string;
  urgency: Urgency;
  conflict: boolean;
  claimants: string[];
  sourceKey: string;
  externalUrl?: string;
  addedDate?: string;
};

export type FleetView = {
  generatedAt: number;
  bots: BotView[];
  tasks: TaskView[];
  tiles: {
    bots: number;
    orgs: number;
    routines: number;
    active: number;
    waiting: number;
    high: number;
  };
  truncated: boolean;
};
