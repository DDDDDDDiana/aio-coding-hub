import { describe, expect, it, vi } from "vitest";
import {
  baseUrlPingMs,
  providerClaudeTerminalLaunchCommand,
  providerDelete,
  providerGetApiKey,
  providerOAuthDisconnect,
  providerOAuthFetchLimits,
  providerOAuthRefresh,
  providerOAuthStartFlow,
  providerOAuthStatus,
  providerSetEnabled,
  providersList,
  providersReorder,
  providerUpsert,
} from "../providers";
import { logToConsole } from "../consoleLog";
import { hasTauriRuntime, invokeTauriOrNull } from "../tauriInvoke";

vi.mock("../tauriInvoke", async () => {
  const actual = await vi.importActual<typeof import("../tauriInvoke")>("../tauriInvoke");
  return {
    ...actual,
    hasTauriRuntime: vi.fn(),
    invokeTauriOrNull: vi.fn(),
  };
});

vi.mock("../consoleLog", async () => {
  const actual = await vi.importActual<typeof import("../consoleLog")>("../consoleLog");
  return {
    ...actual,
    logToConsole: vi.fn(),
  };
});

describe("services/providers", () => {
  it("returns null without tauri runtime", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(false);

    await expect(providersList("claude")).resolves.toBeNull();
    await expect(baseUrlPingMs("https://example.com")).resolves.toBeNull();
    await expect(providerSetEnabled(1, true)).resolves.toBeNull();
    await expect(providerDelete(1)).resolves.toBeNull();
    await expect(providersReorder("claude", [1])).resolves.toBeNull();
    await expect(providerClaudeTerminalLaunchCommand(1)).resolves.toBeNull();

    expect(logToConsole).not.toHaveBeenCalled();
  });

  it("rethrows and logs when invoke fails", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(true);
    vi.mocked(invokeTauriOrNull).mockRejectedValueOnce(new Error("providers boom"));

    await expect(providersList("claude")).rejects.toThrow("providers boom");
    expect(logToConsole).toHaveBeenCalledWith(
      "error",
      "读取供应商列表失败",
      expect.objectContaining({
        cmd: "providers_list",
        error: expect.stringContaining("providers boom"),
      })
    );
  });

  it("treats null invoke result as error when runtime exists", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(true);
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce(null);

    await expect(providersList("claude")).rejects.toThrow("IPC_NULL_RESULT: providers_list");
  });

  it("builds provider_upsert args as before", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(true);
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({ id: 1, cli_key: "claude" } as any);

    await providerUpsert({
      provider_id: null,
      cli_key: "claude",
      name: "P1",
      base_urls: ["https://example.com"],
      base_url_mode: "order",
      api_key: null,
      enabled: true,
      cost_multiplier: 1,
      priority: null,
      claude_models: null,
      limit_5h_usd: null,
      limit_daily_usd: null,
      daily_reset_mode: "fixed",
      daily_reset_time: "00:00:00",
      limit_weekly_usd: null,
      limit_monthly_usd: null,
      limit_total_usd: null,
    });

    expect(invokeTauriOrNull).toHaveBeenCalledWith(
      "provider_upsert",
      expect.objectContaining({
        providerId: null,
        cliKey: "claude",
        name: "P1",
      })
    );
  });

  it("passes providers command args with stable contract fields", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(true);
    vi.mocked(invokeTauriOrNull)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce(120 as any)
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockResolvedValueOnce(true as any)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce("bash '/tmp/aio.sh'" as any);

    await providersList("claude");
    await baseUrlPingMs("https://api.example.com");
    await providerSetEnabled(1, true);
    await providerDelete(1);
    await providersReorder("claude", [2, 1]);
    await providerClaudeTerminalLaunchCommand(5);

    expect(invokeTauriOrNull).toHaveBeenCalledWith("providers_list", {
      cliKey: "claude",
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("base_url_ping_ms", {
      baseUrl: "https://api.example.com",
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_set_enabled", {
      providerId: 1,
      enabled: true,
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_delete", {
      providerId: 1,
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("providers_reorder", {
      cliKey: "claude",
      orderedProviderIds: [2, 1],
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_claude_terminal_launch_command", {
      providerId: 5,
    });
  });

  it("providerGetApiKey delegates to invokeService", async () => {
    vi.mocked(hasTauriRuntime).mockReturnValue(true);
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce("sk-test-key" as any);

    const result = await providerGetApiKey(42);
    expect(result).toBe("sk-test-key");
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_get_api_key", { providerId: 42 });
  });

  it("providerOAuthStartFlow calls invokeTauriOrNull directly", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({
      success: true,
      provider_type: "google",
      expires_at: 1700000000,
    });

    const result = await providerOAuthStartFlow("claude", 10);
    expect(result).toEqual({
      success: true,
      provider_type: "google",
      expires_at: 1700000000,
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_oauth_start_flow", {
      cliKey: "claude",
      providerId: 10,
    });
  });

  it("providerOAuthStartFlow returns null when tauri is absent", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce(null);

    const result = await providerOAuthStartFlow("codex", 1);
    expect(result).toBeNull();
  });

  it("providerOAuthRefresh calls invokeTauriOrNull directly", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({
      success: true,
      expires_at: 1700001000,
    });

    const result = await providerOAuthRefresh(20);
    expect(result).toEqual({ success: true, expires_at: 1700001000 });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_oauth_refresh", { providerId: 20 });
  });

  it("providerOAuthDisconnect calls invokeTauriOrNull directly", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({ success: true });

    const result = await providerOAuthDisconnect(30);
    expect(result).toEqual({ success: true });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_oauth_disconnect", {
      providerId: 30,
    });
  });

  it("providerOAuthStatus calls invokeTauriOrNull directly", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({
      connected: true,
      provider_type: "google",
      email: "test@example.com",
      expires_at: 1700002000,
      has_refresh_token: true,
    });

    const result = await providerOAuthStatus(40);
    expect(result).toEqual({
      connected: true,
      provider_type: "google",
      email: "test@example.com",
      expires_at: 1700002000,
      has_refresh_token: true,
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_oauth_status", { providerId: 40 });
  });

  it("providerOAuthFetchLimits calls invokeTauriOrNull directly", async () => {
    vi.mocked(invokeTauriOrNull).mockResolvedValueOnce({
      limit_short_label: "1h",
      limit_5h_text: "100 requests",
      limit_weekly_text: "1000 requests",
      raw_json: { key: "value" },
    });

    const result = await providerOAuthFetchLimits(50);
    expect(result).toEqual({
      limit_short_label: "1h",
      limit_5h_text: "100 requests",
      limit_weekly_text: "1000 requests",
      raw_json: { key: "value" },
    });
    expect(invokeTauriOrNull).toHaveBeenCalledWith("provider_oauth_fetch_limits", {
      providerId: 50,
    });
  });
});
