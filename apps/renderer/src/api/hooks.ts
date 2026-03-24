// ============================================================
// SchentiCAD API Hooks — TanStack Query for DB synchronization
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi, pagesApi, elementsApi, wiresApi, bmkApi } from "./client";
import type { PlacedElement, Wire } from "@schenticad/shared";

// --- Query Keys ---

export const queryKeys = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  pages: (projectId: string) => ["pages", projectId] as const,
  page: (id: string) => ["page", id] as const,
  elements: (pageId: string) => ["elements", pageId] as const,
  wires: (pageId: string) => ["wires", pageId] as const,
  bmk: (projectId: string) => ["bmk", projectId] as const,
};

// ─── Project Queries ───

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectsApi.list(),
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: queryKeys.project(id!),
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });
}

// ─── Page Queries ───

export function usePages(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.pages(projectId!),
    queryFn: () => pagesApi.list(projectId!),
    enabled: !!projectId,
  });
}

// ─── Element Queries ───

export function useElements(pageId: string | null) {
  return useQuery({
    queryKey: queryKeys.elements(pageId!),
    queryFn: () => elementsApi.list(pageId!),
    enabled: !!pageId,
  });
}

// ─── Wire Queries ───

export function useWires(pageId: string | null) {
  return useQuery({
    queryKey: queryKeys.wires(pageId!),
    queryFn: () => wiresApi.list(pageId!),
    enabled: !!pageId,
  });
}

// ─── BMK Queries ───

export function useBmkEntries(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.bmk(projectId!),
    queryFn: () => bmkApi.list(projectId!),
    enabled: !!projectId,
  });
}

// ─── Project Mutations ───

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; company?: string; creator?: string; description?: string }) =>
      projectsApi.update(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.projects });
      qc.invalidateQueries({ queryKey: queryKeys.project(vars.id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

// ─── Page Mutations ───

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: pagesApi.create,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.pages(vars.projectId) }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; projectId: string }) => pagesApi.delete(vars.id),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.pages(vars.projectId) }),
  });
}

// ─── Element Mutations (with optimistic updates) ───

export function useCreateElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: elementsApi.create,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.elements(vars.pageId) }),
  });
}

export function useUpdateElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pageId, ...data }: { id: string; pageId: string; x?: number; y?: number; rotation?: number; bmk?: string }) =>
      elementsApi.update(id, data),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.elements(vars.pageId) });
      const previous = qc.getQueryData<PlacedElement[]>(queryKeys.elements(vars.pageId));
      if (previous) {
        qc.setQueryData<PlacedElement[]>(queryKeys.elements(vars.pageId),
          previous.map((e) => (e.id === vars.id ? { ...e, ...vars } : e)),
        );
      }
      return { previous, pageId: vars.pageId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.elements(context.pageId), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.elements(vars.pageId) });
    },
  });
}

export function useDeleteElement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; pageId: string }) => elementsApi.delete(vars.id),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.elements(vars.pageId) });
      const previous = qc.getQueryData<PlacedElement[]>(queryKeys.elements(vars.pageId));
      if (previous) {
        qc.setQueryData<PlacedElement[]>(queryKeys.elements(vars.pageId),
          previous.filter((e) => e.id !== vars.id),
        );
      }
      return { previous, pageId: vars.pageId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.elements(context.pageId), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.elements(vars.pageId) });
    },
  });
}

// ─── Wire Mutations (with optimistic updates) ───

export function useCreateWire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: wiresApi.create,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.wires(vars.pageId) }),
  });
}

export function useUpdateWire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pageId, ...data }: { id: string; pageId: string; name?: string; gauge?: string; color?: string }) =>
      wiresApi.update(id, data),
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.wires(vars.pageId) });
    },
  });
}

export function useDeleteWire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; pageId: string }) => wiresApi.delete(vars.id),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.wires(vars.pageId) });
      const previous = qc.getQueryData<Wire[]>(queryKeys.wires(vars.pageId));
      if (previous) {
        qc.setQueryData<Wire[]>(queryKeys.wires(vars.pageId),
          previous.filter((w) => w.id !== vars.id),
        );
      }
      return { previous, pageId: vars.pageId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.wires(context.pageId), context.previous);
      }
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.wires(vars.pageId) });
    },
  });
}

// ─── BMK Mutations ───

export function useAllocateBmk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bmkApi.allocate,
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.bmk(vars.projectId) }),
  });
}

export function useRenameBmk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; designation: string; projectId: string }) =>
      bmkApi.rename(vars.id, vars.designation),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.bmk(vars.projectId) }),
  });
}

export function useDeleteBmk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; projectId: string }) => bmkApi.delete(vars.id),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.bmk(vars.projectId) }),
  });
}
