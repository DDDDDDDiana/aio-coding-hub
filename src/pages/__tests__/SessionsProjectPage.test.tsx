import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "../../test/utils/reactQuery";
import { setTauriRuntime } from "../../test/utils/tauriRuntime";
vi.mock("../../services/clipboard", () => ({ copyText: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => {
    const items = Array.from({ length: count }, (_, i) => ({
      index: i,
      key: String(i),
      start: i * 100,
      size: 100,
      end: (i + 1) * 100,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * 100,
    };
  },
}));
vi.mock("../../services/cliSessions", async () => {
  const actual = await vi.importActual<typeof import("../../services/cliSessions")>(
    "../../services/cliSessions"
  );
  return {
    ...actual,
    cliSessionsProjectsList: vi.fn().mockResolvedValue([]),
    cliSessionsSessionsList: vi.fn().mockResolvedValue([]),
  };
});
import { cliSessionsSessionsList, cliSessionsProjectsList } from "../../services/cliSessions";
import { SessionsProjectPage } from "../SessionsProjectPage";
function renderWithRoute(route: string) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/sessions/:source/:projectId" element={<SessionsProjectPage />} />
          <Route path="/sessions/:source" element={<SessionsProjectPage />} />
          <Route path="*" element={<SessionsProjectPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
describe("pages/SessionsProjectPage", () => {
  beforeEach(() => {
    setTauriRuntime();
    vi.mocked(cliSessionsProjectsList).mockResolvedValue([]);
    vi.mocked(cliSessionsSessionsList).mockResolvedValue([]);
  });
  it("renders error state for invalid source", () => {
    setTauriRuntime();
    renderWithRoute("/sessions/invalid/proj1");
    expect(screen.getByText("无效来源")).toBeInTheDocument();
  });
  it("renders sessions list with data", async () => {
    setTauriRuntime();
    vi.mocked(cliSessionsProjectsList).mockResolvedValue([
      {
        source: "claude",
        id: "proj1",
        display_path: "/path",
        short_name: "Proj",
        session_count: 2,
        last_modified: 1740000000,
        model_provider: null,
        wsl_distro: null,
      },
    ]);
    vi.mocked(cliSessionsSessionsList).mockResolvedValue([
      {
        source: "claude",
        session_id: "s-1",
        file_path: "/f.json",
        first_prompt: "Hello world",
        message_count: 10,
        created_at: 1740000000,
        modified_at: 1740000000,
        git_branch: "main",
        project_path: "/path",
        is_sidechain: false,
        cwd: "/path",
        model_provider: "anthropic",
        cli_version: "1.0",
        wsl_distro: null,
      },
    ]);
    renderWithRoute("/sessions/claude/proj1");
    expect(await screen.findByText("Hello world")).toBeInTheDocument();
    expect(screen.getAllByText("main").length).toBeGreaterThan(0);
    expect(screen.getAllByText("anthropic").length).toBeGreaterThan(0);
  });
  it("filters sessions by search text", async () => {
    setTauriRuntime();
    vi.mocked(cliSessionsSessionsList).mockResolvedValue([
      {
        source: "claude",
        session_id: "s-1",
        file_path: "/f1.json",
        first_prompt: "Alpha task",
        message_count: 5,
        created_at: 1740000000,
        modified_at: 1740000000,
        git_branch: null,
        project_path: null,
        is_sidechain: null,
        cwd: null,
        model_provider: null,
        cli_version: null,
        wsl_distro: null,
      },
      {
        source: "claude",
        session_id: "s-2",
        file_path: "/f2.json",
        first_prompt: "Beta task",
        message_count: 3,
        created_at: 1740000000,
        modified_at: 1740000000,
        git_branch: null,
        project_path: null,
        is_sidechain: null,
        cwd: null,
        model_provider: null,
        cli_version: null,
        wsl_distro: null,
      },
    ]);
    renderWithRoute("/sessions/claude/proj1");
    expect(await screen.findByText("Alpha task")).toBeInTheDocument();
    const searchInput = screen.getByLabelText("搜索会话");
    fireEvent.change(searchInput, { target: { value: "Beta" } });
    expect(screen.queryByText("Alpha task")).not.toBeInTheDocument();
    expect(screen.getByText("Beta task")).toBeInTheDocument();
  });
});
