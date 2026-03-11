import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
      start: i * 80,
      size: 80,
      end: (i + 1) * 80,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * 80,
    };
  },
}));
vi.mock("../../services/cliSessions", async () => {
  const actual = await vi.importActual<typeof import("../../services/cliSessions")>(
    "../../services/cliSessions"
  );
  return { ...actual, cliSessionsProjectsList: vi.fn().mockResolvedValue([]) };
});
import { cliSessionsProjectsList } from "../../services/cliSessions";
import { SessionsPage } from "../SessionsPage";
function renderWithProviders(ui: React.ReactElement, { route = "/" } = {}) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
describe("pages/SessionsPage", () => {
  beforeEach(() => {
    setTauriRuntime();
    vi.mocked(cliSessionsProjectsList).mockResolvedValue([]);
  });
  it("renders loading state with Tauri runtime", () => {
    setTauriRuntime();
    renderWithProviders(<SessionsPage />, { route: "/?source=claude" });
    expect(screen.getByText("Session 会话")).toBeInTheDocument();
  });
  it("renders projects when data is available", async () => {
    setTauriRuntime();
    vi.mocked(cliSessionsProjectsList).mockResolvedValue([
      {
        source: "claude",
        id: "proj-1",
        display_path: "/home/user/proj",
        short_name: "My Project",
        session_count: 5,
        last_modified: 1740000000,
        model_provider: "anthropic",
        wsl_distro: null,
      },
    ]);
    renderWithProviders(<SessionsPage />, { route: "/?source=claude" });
    expect(await screen.findByText("My Project")).toBeInTheDocument();
    expect(screen.getByText("anthropic")).toBeInTheDocument();
  });
  it("filters projects by search text", async () => {
    setTauriRuntime();
    vi.mocked(cliSessionsProjectsList).mockResolvedValue([
      {
        source: "claude",
        id: "proj-1",
        display_path: "/home/user/proj",
        short_name: "Alpha",
        session_count: 3,
        last_modified: 1740000000,
        model_provider: null,
        wsl_distro: null,
      },
      {
        source: "claude",
        id: "proj-2",
        display_path: "/home/user/beta",
        short_name: "Beta",
        session_count: 1,
        last_modified: 1740000000,
        model_provider: null,
        wsl_distro: null,
      },
    ]);
    renderWithProviders(<SessionsPage />, { route: "/?source=claude" });
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    const searchInput = screen.getByLabelText("搜索项目");
    fireEvent.change(searchInput, { target: { value: "Beta" } });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
