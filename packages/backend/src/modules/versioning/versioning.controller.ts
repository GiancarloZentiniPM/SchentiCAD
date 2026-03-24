import { Controller, Get, Post, Delete, Param, Body, Query } from "@nestjs/common";
import { VersioningService } from "./versioning.service";

@Controller("api/projects/:projectId/versioning")
export class VersioningController {
  constructor(private readonly versioningService: VersioningService) {}

  // ─── Branches ───────────────────────────────────────────

  @Get("branches")
  findBranches(@Param("projectId") projectId: string) {
    return this.versioningService.findBranches(projectId);
  }

  @Post("branches")
  createBranch(
    @Param("projectId") projectId: string,
    @Body() body: { name: string; headCommitId?: string },
  ) {
    return this.versioningService.createBranch({ projectId, ...body });
  }

  @Delete("branches/:branchId")
  deleteBranch(@Param("branchId") branchId: string) {
    return this.versioningService.deleteBranch(branchId);
  }

  // ─── Commits ────────────────────────────────────────────

  @Get("commits")
  findCommits(
    @Param("projectId") projectId: string,
    @Query("branchId") branchId?: string,
  ) {
    return this.versioningService.findCommits(projectId, branchId);
  }

  @Get("commits/:commitId")
  findCommit(@Param("commitId") commitId: string) {
    return this.versioningService.findCommit(commitId);
  }

  @Post("commits")
  createCommit(
    @Param("projectId") projectId: string,
    @Body()
    body: {
      branchId: string;
      parentCommitId?: string;
      message: string;
      authorName?: string;
      snapshotHash?: string;
      snapshot?: string;
      deltas?: { entityType: string; entityId: string; operation: string; oldValue?: string; newValue?: string }[];
    },
  ) {
    return this.versioningService.createCommit({ projectId, ...body });
  }

  // ─── Snapshot ───────────────────────────────────────────

  @Get("commits/:commitId/snapshot")
  getSnapshot(@Param("commitId") commitId: string) {
    return this.versioningService.getSnapshot(commitId);
  }

  // ─── History ────────────────────────────────────────────

  @Get("history/:branchId")
  getHistory(
    @Param("projectId") projectId: string,
    @Param("branchId") branchId: string,
    @Query("limit") limit?: string,
  ) {
    return this.versioningService.getHistory(projectId, branchId, limit ? parseInt(limit, 10) : undefined);
  }
}
