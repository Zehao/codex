import { useEffect, useMemo, useRef, useState } from "react";
import { AppServerJsonRpcClient, JsonRpcClientError } from "./api";
import type {
  ApprovalPolicy,
  ChatMessage,
  ConnectionStatus,
  InitializeCapabilities,
  InitializeResponse,
  JsonValue,
  NotificationEntry,
  PendingServerRequest,
  SandboxMode,
  Thread,
  ThreadItem,
  Turn,
  UserInput,
  WireEvent
} from "./types";
import { isRecord } from "./types";

const defaultWsUrl = import.meta.env.VITE_CODEX_RPC_URL || "/rpc";
const defaultCwd =
  import.meta.env.VITE_CODEX_DEFAULT_CWD || "/Users/bytedance/sandbox_codex/codex/debug-project";

function nowText() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJson(text: string): JsonValue {
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }
  return JSON.parse(trimmed) as JsonValue;
}

function errorText(error: unknown) {
  if (error instanceof JsonRpcClientError) {
    return error.code === undefined ? error.message : `${error.message} (${error.code})`;
  }
  return error instanceof Error ? error.message : String(error);
}

function statusLabel(status: ConnectionStatus) {
  const labels: Record<ConnectionStatus, string> = {
    disconnected: "未连接",
    connecting: "连接中",
    connected: "已连接",
    initialized: "已初始化"
  };
  return labels[status];
}

function threadStatusText(thread?: Thread) {
  const status = thread?.status;
  if (!status) {
    return "-";
  }
  if (status.type === "active") {
    return `active: ${status.activeFlags.join(", ") || "turn"}`;
  }
  return status.type;
}

function compactId(value?: string | null) {
  if (!value) {
    return "-";
  }
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function textFromUserInputs(inputs?: UserInput[]) {
  if (!inputs?.length) {
    return "";
  }
  return inputs
    .map((input) => {
      if (input.type === "text") {
        return input.text;
      }
      if (input.type === "localImage") {
        return `[local image] ${input.path}`;
      }
      if (input.type === "image") {
        return `[image] ${input.url}`;
      }
      return `[${input.type}] ${input.name}`;
    })
    .join("\n");
}

function chatMessageFromItem(item: ThreadItem): ChatMessage | undefined {
  if (item.type === "userMessage") {
    return {
      id: item.clientId || item.id,
      role: "user",
      title: "User",
      text: textFromUserInputs(item.content),
      status: "completed"
    };
  }
  if (item.type === "agentMessage") {
    return {
      id: item.id,
      role: "assistant",
      title: "Assistant",
      text: item.text || "",
      status: "completed"
    };
  }
  if (item.type === "reasoning") {
    const parts = [...(item.summary || []), ...((item.content as string[] | undefined) || [])];
    return {
      id: item.id,
      role: "reasoning",
      title: "Reasoning",
      text: parts.join("\n"),
      status: "completed"
    };
  }
  if (item.type === "plan") {
    return {
      id: item.id,
      role: "system",
      title: "Plan",
      text: item.text || "",
      status: "completed"
    };
  }
  if (item.type === "commandExecution") {
    const lines = [
      `$ ${item.command || ""}`,
      item.cwd ? `cwd: ${item.cwd}` : "",
      item.aggregatedOutput || "",
      item.exitCode === null || item.exitCode === undefined ? "" : `exit: ${item.exitCode}`
    ].filter(Boolean);
    return {
      id: item.id,
      role: "tool",
      title: "Command",
      text: lines.join("\n"),
      status: item.status
    };
  }
  if (["fileChange", "mcpToolCall", "dynamicToolCall", "webSearch"].includes(item.type)) {
    return {
      id: item.id,
      role: "tool",
      title: item.type,
      text: pretty(item),
      status: item.status
    };
  }
  return undefined;
}

function decodeBase64Text(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

function defaultResponseForServerRequest(method: string) {
  if (method === "item/commandExecution/requestApproval") {
    return pretty({ decision: "decline" });
  }
  if (method === "item/fileChange/requestApproval") {
    return pretty({ decision: "decline" });
  }
  if (method === "mcpServer/elicitation/request") {
    return pretty({ action: "decline", content: null, _meta: null });
  }
  if (method === "item/tool/requestUserInput") {
    return pretty({ answers: {} });
  }
  return pretty({});
}

function notificationParam<T = Record<string, unknown>>(params: JsonValue | undefined): T | undefined {
  return isRecord(params) ? (params as T) : undefined;
}

const rpcMethodPresets = [
  { label: "config/read", method: "config/read", params: { includeLayers: false } },
  { label: "thread/list", method: "thread/list", params: {} },
  { label: "thread/start", method: "thread/start", params: { cwd: defaultCwd } },
  {
    label: "turn/start",
    method: "turn/start",
    params: {
      threadId: "REPLACE_WITH_THREAD_ID",
      clientUserMessageId: "web-user-debug",
      input: [{ type: "text", text: "hello", text_elements: [] }]
    }
  },
  {
    label: "turn/interrupt",
    method: "turn/interrupt",
    params: { threadId: "REPLACE_WITH_THREAD_ID", turnId: "REPLACE_WITH_TURN_ID" }
  },
  { label: "account/getAuthStatus", method: "account/getAuthStatus", params: {} },
  { label: "自定义", method: "__custom__", params: {} }
] as const;

export default function App() {
  const clientRef = useRef<AppServerJsonRpcClient | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [wsUrl, setWsUrl] = useState(defaultWsUrl);
  const [cwd, setCwd] = useState(defaultCwd);
  const [model, setModel] = useState("");
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>("");
  const [sandbox, setSandbox] = useState<SandboxMode>("");
  const [experimentalApi, setExperimentalApi] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [initializeResult, setInitializeResult] = useState<InitializeResponse | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [prompt, setPrompt] = useState("用一句话介绍当前 Codex app-server 的作用。");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wireEvents, setWireEvents] = useState<WireEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingServerRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [rawMethod, setRawMethod] = useState("config/read");
  const [customRawMethod, setCustomRawMethod] = useState("");
  const [rawParams, setRawParams] = useState(pretty({ includeLayers: false }));
  const [rawResult, setRawResult] = useState("");
  const [selectedWireEventId, setSelectedWireEventId] = useState<number | null>(null);

  const canUseRpc = status === "initialized";
  const canStartTurn = canUseRpc && thread && !busy;
  const latestInbound = wireEvents.find((event) => event.direction === "in");
  const selectedWireEvent =
    wireEvents.find((event) => event.id === selectedWireEventId) || latestInbound || wireEvents[0];
  const effectiveRawMethod = rawMethod === "__custom__" ? customRawMethod.trim() : rawMethod.trim();

  const initParams = useMemo(() => {
    const capabilities: InitializeCapabilities = {
      experimentalApi,
      requestAttestation: false
    };
    return {
      clientInfo: {
        name: "codex-web-debugger",
        title: "Codex Web Debugger",
        version: "0.1.0"
      },
      capabilities
    };
  }, [experimentalApi]);

  function appendWire(event: WireEvent) {
    setWireEvents((current) => [event, ...current].slice(0, 300));
  }

  function appendNotification(method: string, params?: JsonValue) {
    setNotifications((current) =>
      [{ id: Date.now() + Math.random(), at: nowText(), method, params }, ...current].slice(0, 160)
    );
  }

  function upsertMessage(message: ChatMessage, append = false) {
    setMessages((current) => {
      const index = current.findIndex((item) => item.id === message.id);
      if (index === -1) {
        return [...current, message];
      }
      return current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, ...message, text: append ? item.text + message.text : message.text }
          : item
      );
    });
  }

  function applyThreadItem(item: ThreadItem) {
    const message = chatMessageFromItem(item);
    if (message) {
      upsertMessage(message);
    }
  }

  function handleNotification(method: string, params?: JsonValue) {
    appendNotification(method, params);
    const payload = notificationParam(params);

    if (method === "thread/started" && payload?.thread) {
      setThread(payload.thread as Thread);
      return;
    }

    if (method === "thread/status/changed" && payload?.thread) {
      setThread(payload.thread as Thread);
      return;
    }

    if (method === "turn/started" && payload?.turn) {
      const nextTurn = payload.turn as Turn;
      setTurn(nextTurn);
      nextTurn.items?.forEach(applyThreadItem);
      return;
    }

    if (method === "turn/completed" && payload?.turn) {
      const nextTurn = payload.turn as Turn;
      setTurn(nextTurn);
      nextTurn.items?.forEach(applyThreadItem);
      return;
    }

    if ((method === "item/started" || method === "item/completed") && payload?.item) {
      applyThreadItem(payload.item as ThreadItem);
      return;
    }

    if (method === "item/agentMessage/delta" && payload?.itemId) {
      upsertMessage(
        {
          id: String(payload.itemId),
          role: "assistant",
          title: "Assistant",
          text: String(payload.delta || ""),
          status: "streaming"
        },
        true
      );
      return;
    }

    if (
      (method === "item/reasoning/textDelta" ||
        method === "item/reasoning/summaryTextDelta" ||
        method === "item/plan/delta" ||
        method === "item/commandExecution/outputDelta") &&
      payload?.itemId
    ) {
      upsertMessage(
        {
          id: String(payload.itemId),
          role: method.includes("reasoning") ? "reasoning" : "tool",
          title: method.includes("reasoning") ? "Reasoning" : "Tool Output",
          text: String(payload.delta || ""),
          status: "streaming"
        },
        true
      );
      return;
    }

    if (
      (method === "command/exec/outputDelta" || method === "process/outputDelta") &&
      (payload?.processId || payload?.processHandle)
    ) {
      const id = String(payload.processId || payload.processHandle);
      upsertMessage(
        {
          id,
          role: "tool",
          title: `${method} ${payload.stream || ""}`,
          text: decodeBase64Text(payload.deltaBase64),
          status: payload.capReached ? "cap reached" : "streaming"
        },
        true
      );
      return;
    }

    if (method === "error" || method === "warning" || method === "guardianWarning") {
      upsertMessage({
        id: `${method}-${Date.now()}`,
        role: "system",
        title: method,
        text: pretty(params || {}),
        status: "notification"
      });
    }
  }

  function attachClient(client: AppServerJsonRpcClient) {
    client.onWire = appendWire;
    client.onNotification = (message) => handleNotification(message.method, message.params);
    client.onServerRequest = (request) => {
      appendNotification(`server request: ${request.method}`, request.params);
      setPendingRequests((current) => [
        ...current,
        {
          id: request.id,
          method: request.method,
          params: request.params,
          receivedAt: nowText(),
          responseText: defaultResponseForServerRequest(request.method)
        }
      ]);
    };
    client.onClose = () => {
      setStatus("disconnected");
      clientRef.current = null;
    };
    client.onError = () => {
      appendNotification("websocket/error");
    };
  }

  async function handleConnect() {
    setBusy(true);
    setStatus("connecting");
    setInitializeResult(null);
    setThread(null);
    setTurn(null);
    setMessages([]);
    setPendingRequests([]);
    try {
      clientRef.current?.disconnect();
      const client = new AppServerJsonRpcClient(wsUrl);
      attachClient(client);
      clientRef.current = client;
      await client.connect();
      setStatus("connected");
      const init = await client.request<InitializeResponse>("initialize", initParams as JsonValue);
      client.notify("initialized");
      setInitializeResult(init);
      setStatus("initialized");
    } catch (error) {
      setStatus("disconnected");
      appendNotification("connect/error", { message: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  function handleDisconnect() {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("disconnected");
  }

  async function handleStartThread() {
    if (!clientRef.current) {
      return;
    }
    setBusy(true);
    try {
      const params: Record<string, JsonValue> = {};
      if (cwd.trim()) {
        params.cwd = cwd.trim();
      }
      if (model.trim()) {
        params.model = model.trim();
      }
      if (approvalPolicy) {
        params.approvalPolicy = approvalPolicy;
      }
      if (sandbox) {
        params.sandbox = sandbox;
      }
      const result = await clientRef.current.request("thread/start", params);
      if (isRecord(result) && isRecord(result.thread)) {
        setThread(result.thread as Thread);
      }
      setTurn(null);
      setMessages([]);
    } catch (error) {
      appendNotification("thread/start error", { message: errorText(error) });
    } finally {
      setBusy(false);
    }
  }

  async function handleStartTurn() {
    if (!clientRef.current || !thread) {
      return;
    }
    const text = prompt.trim();
    if (!text) {
      return;
    }

    const clientUserMessageId = `web-user-${Date.now()}`;
    upsertMessage({
      id: clientUserMessageId,
      role: "user",
      title: "User",
      text,
      status: "submitted"
    });
    setPrompt("");
    setBusy(true);

    try {
      const input: UserInput[] = [{ type: "text", text, text_elements: [] }];
      const params = {
        threadId: thread.id,
        clientUserMessageId,
        input
      };
      const result = await clientRef.current.request("turn/start", params as JsonValue);
      if (isRecord(result) && isRecord(result.turn)) {
        setTurn(result.turn as Turn);
      }
    } catch (error) {
      appendNotification("turn/start error", { message: errorText(error) });
      upsertMessage({
        id: `${clientUserMessageId}-error`,
        role: "system",
        title: "turn/start failed",
        text: errorText(error),
        status: "error"
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleInterrupt() {
    if (!clientRef.current || !thread || !turn) {
      return;
    }
    try {
      await clientRef.current.request("turn/interrupt", {
        threadId: thread.id,
        turnId: turn.id
      });
    } catch (error) {
      appendNotification("turn/interrupt error", { message: errorText(error) });
    }
  }

  async function handleRawRequest() {
    if (!clientRef.current || !effectiveRawMethod) {
      return;
    }
    setBusy(true);
    try {
      const params = parseJson(rawParams);
      const result = await clientRef.current.request(effectiveRawMethod, params);
      setRawResult(pretty(result));
    } catch (error) {
      setRawResult(errorText(error));
    } finally {
      setBusy(false);
    }
  }

  function updatePendingResponse(id: PendingServerRequest["id"], responseText: string) {
    setPendingRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, responseText } : request))
    );
  }

  function completePending(id: PendingServerRequest["id"]) {
    setPendingRequests((current) => current.filter((request) => request.id !== id));
  }

  function sendServerRequestResult(request: PendingServerRequest) {
    if (!clientRef.current) {
      return;
    }
    try {
      clientRef.current.respond(request.id, parseJson(request.responseText));
      completePending(request.id);
    } catch (error) {
      appendNotification("server response error", { message: errorText(error) });
    }
  }

  function sendServerRequestError(request: PendingServerRequest) {
    clientRef.current?.respondError(request.id, {
      code: -32000,
      message: "Rejected from Codex Web Debugger"
    });
    completePending(request.id);
  }

  function handleRawMethodChange(method: string) {
    setRawMethod(method);
    const preset = rpcMethodPresets.find((item) => item.method === method);
    if (preset) {
      setRawParams(pretty(preset.params));
    }
  }

  useEffect(() => {
    const container = chatScrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => () => clientRef.current?.disconnect(), []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">CODEX APP-SERVER</p>
          <h1>JSON-RPC Web Debugger</h1>
        </div>
        <div className="status-strip">
          <span className={`status-dot ${status}`} />
          <strong>{statusLabel(status)}</strong>
          <code>{thread ? `thread ${compactId(thread.id)}` : "no thread"}</code>
          <code>{turn ? `turn ${compactId(turn.id)} ${turn.status}` : "no turn"}</code>
        </div>
      </header>

      <section className="panel connection-section">
        <div className="panel-head">
          <div>
            <h2>连接信息</h2>
            <p className="section-note">管理 WebSocket、thread 默认参数和初始化状态。</p>
          </div>
          <span className="pill">{statusLabel(status)}</span>
        </div>

        <div className="connection-grid">
          <label>
            WebSocket URL
            <input value={wsUrl} onChange={(event) => setWsUrl(event.target.value)} />
          </label>
          <label>
            cwd
            <input value={cwd} onChange={(event) => setCwd(event.target.value)} />
          </label>
          <label>
            model（留空使用服务端配置）
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label>
            approvalPolicy
            <select
              value={approvalPolicy}
              onChange={(event) => setApprovalPolicy(event.target.value as ApprovalPolicy)}
            >
              <option value="">server default</option>
              <option value="untrusted">untrusted</option>
              <option value="on-failure">on-failure</option>
              <option value="on-request">on-request</option>
              <option value="never">never</option>
            </select>
          </label>
          <label>
            sandbox
            <select value={sandbox} onChange={(event) => setSandbox(event.target.value as SandboxMode)}>
              <option value="">server default</option>
              <option value="read-only">read-only</option>
              <option value="workspace-write">workspace-write</option>
              <option value="danger-full-access">danger-full-access</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={experimentalApi}
              onChange={(event) => setExperimentalApi(event.target.checked)}
            />
            初始化时声明 experimentalApi
          </label>
        </div>

        <div className="connection-actions">
          <div className="button-row">
            <button className="primary" disabled={busy || status !== "disconnected"} onClick={() => void handleConnect()}>
              连接并初始化
            </button>
            <button disabled={status === "disconnected"} onClick={handleDisconnect}>
              断开
            </button>
            <button className="primary" disabled={!canUseRpc || busy} onClick={() => void handleStartThread()}>
              thread/start
            </button>
          </div>
          <div className="facts">
            <div>
              <span>userAgent</span>
              <code>{initializeResult?.userAgent || "-"}</code>
            </div>
            <div>
              <span>codexHome</span>
              <code>{initializeResult?.codexHome || "-"}</code>
            </div>
            <div>
              <span>thread status</span>
              <code>{threadStatusText(thread || undefined)}</code>
            </div>
            <div>
              <span>cwd</span>
              <code>{thread?.cwd || "-"}</code>
            </div>
          </div>
        </div>
      </section>

      <section className="panel conversation-section">
        <div className="panel-head">
          <div>
            <h2>对话 / 对话日志</h2>
            <p className="section-note">左侧是可读对话流，右侧是通知和 wire frame。</p>
          </div>
          <div className="button-row">
            <button disabled={!turn || turn.status !== "inProgress"} onClick={() => void handleInterrupt()}>
              interrupt
            </button>
            <button disabled={!messages.length} onClick={() => setMessages([])}>
              清空对话
            </button>
          </div>
        </div>

        <div className="conversation-grid">
          <div className="chat-column">
            <div className="chat-list" ref={chatScrollRef}>
              {messages.length ? (
                messages.map((message) => (
                  <article key={message.id} className={`message ${message.role}`}>
                    <div className="message-meta">
                      <strong>{message.title}</strong>
                      <span>{message.status || message.role}</span>
                    </div>
                    <pre>{message.text || "(empty)"}</pre>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  连接、初始化并创建 thread 后，即可提交 turn/start。通知和 item delta 会实时落在这里。
                </div>
              )}
            </div>

            <div className="composer">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    void handleStartTurn();
                  }
                }}
                placeholder="输入用户消息，Cmd/Ctrl + Enter 发送"
              />
              <button className="primary send-button" disabled={!canStartTurn} onClick={() => void handleStartTurn()}>
                turn/start
              </button>
            </div>
          </div>

          <aside className="log-column">
            <div className="subsection-head">
              <h3>通知</h3>
              <button disabled={!notifications.length} onClick={() => setNotifications([])}>
                清空
              </button>
            </div>
            <div className="notification-list">
              {notifications.length ? (
                notifications.slice(0, 40).map((item) => (
                  <details key={item.id} className="notification">
                    <summary>
                      <span>{item.method}</span>
                      <small>{item.at}</small>
                    </summary>
                    <pre>{pretty(item.params || {})}</pre>
                  </details>
                ))
              ) : (
                <div className="empty-state compact">暂无通知。</div>
              )}
            </div>

            <div className="subsection-head">
              <h3>Wire Log</h3>
              <div className="button-row">
                <span className="muted">{wireEvents.length} frames</span>
                <button disabled={!wireEvents.length} onClick={() => setWireEvents([])}>
                  清空
                </button>
              </div>
            </div>
            <div className="wire-list compact-wire-list">
              {wireEvents.map((event) => (
                <button
                  key={event.id}
                  className={`wire-row ${event.direction} ${selectedWireEvent?.id === event.id ? "selected" : ""}`}
                  onClick={() => setSelectedWireEventId(event.id)}
                >
                  <span>{event.direction === "in" ? "←" : "→"} {event.label}</span>
                  <small>{event.at}</small>
                </button>
              ))}
            </div>
            {latestInbound ? <div className="latest-frame">latest inbound: {latestInbound.label}</div> : null}
            <div className="wire-frame-preview">
              <div className="subsection-head">
                <h3>选中帧详情</h3>
                <span className="muted">{selectedWireEvent ? selectedWireEvent.label : "none"}</span>
              </div>
              <pre>{selectedWireEvent ? pretty(selectedWireEvent.payload) : "从 Wire Log 选择一条记录查看完整 JSON-RPC payload。"}</pre>
            </div>
          </aside>
        </div>
      </section>

      <section className="panel rpc-section">
        <div className="panel-head">
          <div>
            <h2>RPC 请求</h2>
            <p className="section-note">用于直接探测 app-server JSON-RPC API；method 使用下拉选择。</p>
          </div>
          <button className="primary" disabled={!canUseRpc || busy || !effectiveRawMethod} onClick={() => void handleRawRequest()}>
            发送 RPC
          </button>
        </div>

        <div className="rpc-grid">
          <div className="rpc-form-card">
            <label>
              method
              <select value={rawMethod} onChange={(event) => handleRawMethodChange(event.target.value)}>
                {rpcMethodPresets.map((preset) => (
                  <option key={preset.method} value={preset.method}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            {rawMethod === "__custom__" ? (
              <label>
                custom method
                <input value={customRawMethod} onChange={(event) => setCustomRawMethod(event.target.value)} />
              </label>
            ) : null}
            <label className="params-editor">
              params JSON
              <textarea value={rawParams} onChange={(event) => setRawParams(event.target.value)} />
            </label>
          </div>

          <div className="rpc-inspector">
            <div className="inspector-card result-preview">
              <div className="subsection-head">
                <h3>RPC Result</h3>
                <span className="muted">last response</span>
              </div>
              <pre>{rawResult || "RPC result will appear here."}</pre>
            </div>
          </div>
        </div>
      </section>

      <section className="panel server-request-section">
        <div className="panel-head">
          <div>
            <h2>Server 请求</h2>
            <p className="section-note">
              这里是服务端反向发起、需要前端回复的 JSON-RPC request，例如审批、用户输入、MCP elicitation。正常对话时通常为空。
            </p>
          </div>
          <span className="pill warn">{pendingRequests.length} pending</span>
        </div>

        <div className="request-list horizontal-request-list">
          {pendingRequests.length ? (
            pendingRequests.map((request) => (
              <article key={String(request.id)} className="request-card">
                <div className="message-meta">
                  <strong>{request.method}</strong>
                  <span>{request.receivedAt} · id {String(request.id)}</span>
                </div>
                <details>
                  <summary>params</summary>
                  <pre>{pretty(request.params || {})}</pre>
                </details>
                <label>
                  result JSON
                  <textarea
                    value={request.responseText}
                    onChange={(event) => updatePendingResponse(request.id, event.target.value)}
                  />
                </label>
                <div className="button-row">
                  <button className="primary" onClick={() => sendServerRequestResult(request)}>
                    发送 result
                  </button>
                  <button className="danger" onClick={() => sendServerRequestError(request)}>
                    发送 error
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state compact">暂无待处理 server request。</div>
          )}
        </div>
      </section>
    </main>
  );
}
