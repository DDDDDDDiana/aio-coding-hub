import { describe, expect, it, vi } from "vitest";

vi.mock("../invokeServiceCommand", () => ({
  invokeService: vi.fn().mockResolvedValue([]),
}));

import { invokeService } from "../invokeServiceCommand";
import {
  cliSessionsProjectsList,
  cliSessionsSessionsList,
  cliSessionsMessagesGet,
  escapeShellArg,
} from "../cliSessions";

describe("services/cliSessions", () => {
  describe("escapeShellArg", () => {
    it("wraps normal string in single quotes (Unix)", () => {
      expect(escapeShellArg("hello")).toBe("'hello'");
    });

    it("handles empty string (Unix)", () => {
      expect(escapeShellArg("")).toBe("''");
    });

    it("escapes single quotes in string (Unix)", () => {
      expect(escapeShellArg("it's")).toBe("'it'\\''s'");
    });

    it("handles Windows platform", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });

      expect(escapeShellArg("hello")).toBe('"hello"');
      expect(escapeShellArg("")).toBe('""');
      expect(escapeShellArg('say "hi"')).toBe('"say ""hi"""');

      Object.defineProperty(navigator, "userAgent", {
        value: originalUA,
        configurable: true,
      });
    });
  });

  describe("cliSessionsProjectsList", () => {
    it("calls invokeService with correct args", async () => {
      await cliSessionsProjectsList("claude");
      expect(invokeService).toHaveBeenCalledWith(
        "读取会话项目列表失败",
        "cli_sessions_projects_list",
        { source: "claude", wslDistro: null }
      );
    });
  });

  describe("cliSessionsSessionsList", () => {
    it("calls invokeService with correct args", async () => {
      await cliSessionsSessionsList("codex", "proj-1");
      expect(invokeService).toHaveBeenCalledWith("读取会话列表失败", "cli_sessions_sessions_list", {
        source: "codex",
        projectId: "proj-1",
        wslDistro: null,
      });
    });
  });

  describe("cliSessionsMessagesGet", () => {
    it("calls invokeService with correct args", async () => {
      await cliSessionsMessagesGet({
        source: "claude",
        file_path: "/path/to/file.json",
        page: 0,
        page_size: 50,
        from_end: true,
      });
      expect(invokeService).toHaveBeenCalledWith("读取会话消息失败", "cli_sessions_messages_get", {
        source: "claude",
        filePath: "/path/to/file.json",
        page: 0,
        pageSize: 50,
        fromEnd: true,
        wslDistro: null,
      });
    });
  });
});
