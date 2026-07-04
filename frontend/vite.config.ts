import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const codexWsTarget = env.VITE_CODEX_WS_TARGET || "ws://127.0.0.1:48879";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/rpc": {
          target: codexWsTarget,
          ws: true,
          changeOrigin: false,
          rewrite: () => "/",
          configure(proxy) {
            proxy.on("proxyReqWs", (proxyReq) => {
              proxyReq.removeHeader("origin");
            });
          }
        }
      }
    }
  };
});
