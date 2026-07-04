export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = { [key: string]: JsonValue | undefined };
export type RequestId = string | number;

export type JsonRpcRequest = {
  id: RequestId;
  method: string;
  params?: JsonValue;
};

export type JsonRpcNotification = {
  method: string;
  params?: JsonValue;
};

export type JsonRpcSuccess = {
  id: RequestId;
  result: JsonValue;
};

export type JsonRpcErrorData = {
  code: number;
  message: string;
  data?: JsonValue;
};

export type JsonRpcFailure = {
  id: RequestId;
  error: JsonRpcErrorData;
};

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcFailure;

export type WireDirection = "in" | "out";

export type WireEvent = {
  id: number;
  at: string;
  direction: WireDirection;
  label: string;
  payload: JsonRpcMessage;
};

export type ClientInfo = {
  name: string;
  title: string | null;
  version: string;
};

export type InitializeCapabilities = {
  experimentalApi: boolean;
  requestAttestation: boolean;
  optOutNotificationMethods?: string[] | null;
};

export type InitializeResponse = {
  userAgent: string;
  codexHome: string;
  platformFamily: string;
  platformOs: string;
};

export type ApprovalPolicy = "" | "untrusted" | "on-failure" | "on-request" | "never";
export type SandboxMode = "" | "read-only" | "workspace-write" | "danger-full-access";

export type ThreadStatus =
  | { type: "notLoaded" }
  | { type: "idle" }
  | { type: "systemError" }
  | { type: "active"; activeFlags: string[] };

export type Thread = {
  id: string;
  sessionId: string;
  preview: string;
  status: ThreadStatus;
  cwd: string;
  path: string | null;
  name: string | null;
  modelProvider: string;
  createdAt: number;
  updatedAt: number;
};

export type TurnStatus = "completed" | "interrupted" | "failed" | "inProgress";

export type Turn = {
  id: string;
  status: TurnStatus;
  error: { message?: string; code?: string } | null;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  items?: ThreadItem[];
};

export type UserInput =
  | { type: "text"; text: string; text_elements: JsonValue[] }
  | { type: "image"; url: string; detail?: string }
  | { type: "localImage"; path: string; detail?: string }
  | { type: "skill"; name: string; path: string }
  | { type: "mention"; name: string; path: string };

export type ThreadItem = {
  type: string;
  id: string;
  clientId?: string | null;
  content?: UserInput[];
  text?: string;
  summary?: string[];
  contentItems?: JsonValue[] | null;
  command?: string;
  cwd?: string;
  status?: string;
  aggregatedOutput?: string | null;
  exitCode?: number | null;
  durationMs?: number | null;
  [key: string]: unknown;
};

export type ChatRole = "user" | "assistant" | "reasoning" | "tool" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  title: string;
  text: string;
  status?: string;
};

export type PendingServerRequest = {
  id: RequestId;
  method: string;
  params?: JsonValue;
  receivedAt: string;
  responseText: string;
};

export type NotificationEntry = {
  id: number;
  at: string;
  method: string;
  params?: JsonValue;
};

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "initialized";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
