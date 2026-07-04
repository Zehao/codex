import type {
  JsonRpcErrorData,
  JsonRpcFailure,
  JsonRpcMessage,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcSuccess,
  JsonValue,
  RequestId,
  WireEvent
} from "./types";
import { isRecord } from "./types";

type PendingCall = {
  method: string;
  resolve: (value: JsonValue) => void;
  reject: (error: JsonRpcClientError) => void;
};

export class JsonRpcClientError extends Error {
  code?: number;
  data?: JsonValue;

  constructor(message: string, code?: number, data?: JsonValue) {
    super(message);
    this.name = "JsonRpcClientError";
    this.code = code;
    this.data = data;
  }
}

export class AppServerJsonRpcClient {
  private socket?: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<RequestId, PendingCall>();

  onStatus?: (status: WebSocket["readyState"]) => void;
  onWire?: (event: WireEvent) => void;
  onNotification?: (message: JsonRpcNotification) => void;
  onServerRequest?: (message: JsonRpcRequest) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;

  constructor(private readonly url: string) {}

  connect(): Promise<void> {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(resolveWebSocketUrl(this.url));
      this.socket = socket;
      this.onStatus?.(socket.readyState);

      const rejectOpen = (message: string) => {
        reject(new JsonRpcClientError(message));
      };

      socket.onopen = () => {
        this.onStatus?.(socket.readyState);
        resolve();
      };

      socket.onmessage = (event) => this.handleMessage(event.data);

      socket.onerror = (event) => {
        this.onError?.(event);
        if (socket.readyState !== WebSocket.OPEN) {
          rejectOpen("WebSocket connection failed");
        }
      };

      socket.onclose = (event) => {
        this.onStatus?.(socket.readyState);
        this.rejectAllPending(new JsonRpcClientError(`WebSocket closed (${event.code})`));
        this.onClose?.(event);
        if (!event.wasClean && socket.readyState !== WebSocket.OPEN) {
          rejectOpen(`WebSocket closed before open (${event.code})`);
        }
      };
    });
  }

  disconnect() {
    this.socket?.close(1000, "closed by frontend");
    this.socket = undefined;
    this.rejectAllPending(new JsonRpcClientError("WebSocket closed by client"));
  }

  request<T extends JsonValue = JsonValue>(method: string, params?: JsonValue): Promise<T> {
    const id = this.nextId++;
    const message: JsonRpcRequest = params === undefined ? { id, method } : { id, method, params };

    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        method,
        resolve: (value) => resolve(value as T),
        reject
      });
    });
    try {
      this.send(message);
    } catch (error) {
      this.pending.delete(id);
      throw error;
    }
    return promise;
  }

  notify(method: string, params?: JsonValue) {
    const message: JsonRpcNotification =
      params === undefined ? { method } : { method, params };
    this.send(message);
  }

  respond(id: RequestId, result: JsonValue) {
    this.send({ id, result });
  }

  respondError(id: RequestId, error: JsonRpcErrorData) {
    this.send({ id, error });
  }

  private handleMessage(raw: unknown) {
    if (typeof raw !== "string") {
      return;
    }

    let message: JsonRpcMessage;
    try {
      message = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      return;
    }

    this.emitWire("in", message);

    if (isResponse(message)) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      pending.resolve(message.result);
      return;
    }

    if (isFailure(message)) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      pending.reject(
        new JsonRpcClientError(message.error.message, message.error.code, message.error.data)
      );
      return;
    }

    if (isRequest(message)) {
      this.onServerRequest?.(message);
      return;
    }

    if (isNotification(message)) {
      this.onNotification?.(message);
    }
  }

  private send(message: JsonRpcMessage) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new JsonRpcClientError("WebSocket is not connected");
    }
    this.socket.send(JSON.stringify(message));
    this.emitWire("out", message);
  }

  private emitWire(direction: "in" | "out", payload: JsonRpcMessage) {
    this.onWire?.({
      id: Date.now() + Math.random(),
      at: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      direction,
      label: labelOf(payload),
      payload
    });
  }

  private rejectAllPending(error: JsonRpcClientError) {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function isRequest(message: JsonRpcMessage): message is JsonRpcRequest {
  return isRecord(message) && "id" in message && "method" in message;
}

function isNotification(message: JsonRpcMessage): message is JsonRpcNotification {
  return isRecord(message) && !("id" in message) && "method" in message;
}

function isResponse(message: JsonRpcMessage): message is JsonRpcSuccess {
  return isRecord(message) && "id" in message && "result" in message;
}

function isFailure(message: JsonRpcMessage): message is JsonRpcFailure {
  return isRecord(message) && "id" in message && "error" in message;
}

function labelOf(message: JsonRpcMessage) {
  if (isRequest(message) || isNotification(message)) {
    return message.method;
  }
  if (isFailure(message)) {
    return `error ${message.id}`;
  }
  return `response ${message.id}`;
}

export function resolveWebSocketUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}${path}`;
}
