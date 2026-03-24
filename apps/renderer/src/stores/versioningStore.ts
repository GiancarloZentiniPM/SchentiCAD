import { create } from "zustand";
import { versioningApi } from "../api/client";

interface BranchInfo {
  id: string;
  name: string;
  headCommitId: string | null;
  createdAt: string;
}

interface CommitInfo {
  id: string;
  message: string;
  authorName: string;
  snapshotHash: string;
  createdAt: string;
  parentCommitId: string | null;
}

interface VersioningState {
  // Data
  branches: BranchInfo[];
  activeBranchId: string | null;
  commits: CommitInfo[];
  loading: boolean;

  // Commit dialog
  commitDialogOpen: boolean;
  commitMessage: string;

  // Merge / conflict
  mergeBranchId: string | null;
  conflicts: any[];

  // Actions
  setActiveBranch: (id: string) => void;
  openCommitDialog: () => void;
  closeCommitDialog: () => void;
  setCommitMessage: (msg: string) => void;

  // API actions
  loadBranches: (projectId: string) => Promise<void>;
  loadHistory: (projectId: string, branchId: string) => Promise<void>;
  createBranch: (projectId: string, name: string) => Promise<void>;
  deleteBranch: (projectId: string, branchId: string) => Promise<void>;
  createCommit: (projectId: string, message: string, snapshot: string, snapshotHash: string) => Promise<void>;
  setMergeBranchId: (id: string | null) => void;
  clearConflicts: () => void;
}

export const useVersioningStore = create<VersioningState>((set, get) => ({
  branches: [],
  activeBranchId: null,
  commits: [],
  loading: false,

  commitDialogOpen: false,
  commitMessage: "",

  mergeBranchId: null,
  conflicts: [],

  setActiveBranch: (id) => set({ activeBranchId: id }),

  openCommitDialog: () => set({ commitDialogOpen: true, commitMessage: "" }),
  closeCommitDialog: () => set({ commitDialogOpen: false, commitMessage: "" }),
  setCommitMessage: (msg) => set({ commitMessage: msg }),

  setMergeBranchId: (id) => set({ mergeBranchId: id }),
  clearConflicts: () => set({ conflicts: [] }),

  loadBranches: async (projectId) => {
    set({ loading: true });
    try {
      const branches = await versioningApi.listBranches(projectId);
      const state = get();
      const activeId = state.activeBranchId ?? branches[0]?.id ?? null;
      set({ branches, activeBranchId: activeId, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadHistory: async (projectId, branchId) => {
    set({ loading: true });
    try {
      const commits = await versioningApi.getHistory(projectId, branchId);
      set({ commits, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createBranch: async (projectId, name) => {
    const { activeBranchId, branches } = get();
    const currentBranch = branches.find((b) => b.id === activeBranchId);
    await versioningApi.createBranch(projectId, {
      name,
      headCommitId: currentBranch?.headCommitId ?? undefined,
    });
    await get().loadBranches(projectId);
  },

  deleteBranch: async (projectId, branchId) => {
    await versioningApi.deleteBranch(projectId, branchId);
    await get().loadBranches(projectId);
  },

  createCommit: async (projectId, message, snapshot, snapshotHash) => {
    const { activeBranchId, branches } = get();
    if (!activeBranchId) return;
    const branch = branches.find((b) => b.id === activeBranchId);
    await versioningApi.createCommit(projectId, {
      branchId: activeBranchId,
      parentCommitId: branch?.headCommitId ?? undefined,
      message,
      snapshot,
      snapshotHash,
    });
    await get().loadBranches(projectId);
    await get().loadHistory(projectId, activeBranchId);
    set({ commitDialogOpen: false, commitMessage: "" });
  },
}));
