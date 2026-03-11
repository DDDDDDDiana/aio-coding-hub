import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  cliSessionsMessagesGet,
  cliSessionsProjectsList,
  cliSessionsSessionsList,
  type CliSessionsSource,
} from "../services/cliSessions";
import { cliSessionsKeys } from "./keys";

export function useCliSessionsProjectsListQuery(source: CliSessionsSource, wslDistro?: string) {
  return useQuery({
    queryKey: cliSessionsKeys.projectsList(source, wslDistro),
    queryFn: () => cliSessionsProjectsList(source, wslDistro),
    enabled: true,
    placeholderData: keepPreviousData,
  });
}

export function useCliSessionsSessionsListQuery(
  source: CliSessionsSource,
  projectId: string,
  options?: { enabled?: boolean; wslDistro?: string }
) {
  const wslDistro = options?.wslDistro;
  return useQuery({
    queryKey: cliSessionsKeys.sessionsList(source, projectId, wslDistro),
    queryFn: () => cliSessionsSessionsList(source, projectId, wslDistro),
    enabled: Boolean(projectId.trim()) && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
  });
}

export function useCliSessionsMessagesInfiniteQuery(
  source: CliSessionsSource,
  filePath: string,
  options?: { enabled?: boolean; fromEnd?: boolean; wslDistro?: string }
) {
  const fromEnd = options?.fromEnd ?? true;
  const wslDistro = options?.wslDistro;
  return useInfiniteQuery({
    queryKey: cliSessionsKeys.messages(source, filePath, fromEnd, wslDistro),
    queryFn: ({ pageParam = 0 }) =>
      cliSessionsMessagesGet({
        source,
        file_path: filePath,
        page: pageParam,
        page_size: 50,
        from_end: fromEnd,
        wsl_distro: wslDistro,
      }),
    enabled: Boolean(filePath.trim()) && (options?.enabled ?? true),
    getNextPageParam: (lastPage) => (lastPage?.has_more ? lastPage.page + 1 : undefined),
    initialPageParam: 0,
  });
}
