import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VersioningService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Branches ───────────────────────────────────────────

  async findBranches(projectId: string) {
    return this.prisma.branch.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findBranch(id: string) {
    return this.prisma.branch.findUnique({ where: { id } });
  }

  async createBranch(data: { projectId: string; name: string; headCommitId?: string }) {
    return this.prisma.branch.create({ data });
  }

  async deleteBranch(id: string) {
    return this.prisma.branch.delete({ where: { id } });
  }

  // ─── Commits ────────────────────────────────────────────

  async findCommits(projectId: string, branchId?: string) {
    const where: Record<string, string> = { projectId };
    if (branchId) where.branchId = branchId;

    return this.prisma.commit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { deltas: true },
    });
  }

  async findCommit(id: string) {
    return this.prisma.commit.findUnique({
      where: { id },
      include: { deltas: true },
    });
  }

  async createCommit(data: {
    projectId: string;
    branchId: string;
    parentCommitId?: string;
    message: string;
    authorName?: string;
    snapshotHash?: string;
    snapshot?: string;
    deltas?: { entityType: string; entityId: string; operation: string; oldValue?: string; newValue?: string }[];
  }) {
    const { deltas, ...commitData } = data;

    const commit = await this.prisma.commit.create({
      data: {
        ...commitData,
        deltas: deltas
          ? {
              create: deltas.map((d) => ({
                entityType: d.entityType,
                entityId: d.entityId,
                operation: d.operation,
                oldValue: d.oldValue ?? "{}",
                newValue: d.newValue ?? "{}",
              })),
            }
          : undefined,
      },
      include: { deltas: true },
    });

    // Update branch head to this commit
    await this.prisma.branch.update({
      where: { id: data.branchId },
      data: { headCommitId: commit.id },
    });

    return commit;
  }

  // ─── Snapshot ───────────────────────────────────────────

  async getSnapshot(commitId: string) {
    const commit = await this.prisma.commit.findUnique({
      where: { id: commitId },
      select: { snapshot: true, snapshotHash: true },
    });
    if (!commit) throw new NotFoundException("Commit not found");
    return { snapshot: JSON.parse(commit.snapshot), hash: commit.snapshotHash };
  }

  // ─── History ────────────────────────────────────────────

  async getHistory(projectId: string, branchId: string, limit = 50) {
    return this.prisma.commit.findMany({
      where: { projectId, branchId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        message: true,
        authorName: true,
        snapshotHash: true,
        createdAt: true,
        parentCommitId: true,
      },
    });
  }
}
