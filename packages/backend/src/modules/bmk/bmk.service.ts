import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class BmkService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string) {
    return this.prisma.bmkEntry.findMany({
      where: { projectId },
      include: { element: true },
      orderBy: [{ prefix: "asc" }, { number: "asc" }],
    });
  }

  findOne(id: string) {
    return this.prisma.bmkEntry.findUnique({
      where: { id },
      include: { element: true },
    });
  }

  async allocate(data: {
    projectId: string;
    prefix: string;
    elementId: string;
    plantDesignation?: string;
    locationDesignation?: string;
  }) {
    // Find next available number for this prefix
    const existing = await this.prisma.bmkEntry.findMany({
      where: { projectId: data.projectId, prefix: data.prefix },
      orderBy: { number: "asc" },
    });

    const usedNumbers = existing.map((e) => e.number);
    let nextNumber = 1;
    for (const used of usedNumbers) {
      if (used === nextNumber) nextNumber++;
      else break;
    }

    const fullDesignation = `${data.prefix}${nextNumber}`;

    return this.prisma.bmkEntry.create({
      data: {
        projectId: data.projectId,
        prefix: data.prefix,
        number: nextNumber,
        fullDesignation,
        elementId: data.elementId,
        plantDesignation: data.plantDesignation ?? "",
        locationDesignation: data.locationDesignation ?? "",
      },
    });
  }

  async rename(id: string, newDesignation: string) {
    const match = newDesignation.match(/^(-[A-Z]+)(\d+)$/i);
    if (!match) throw new Error("Invalid BMK format");

    const [, prefix, numStr] = match;
    const number = parseInt(numStr!, 10);

    return this.prisma.bmkEntry.update({
      where: { id },
      data: { prefix: prefix!, number, fullDesignation: newDesignation },
    });
  }

  remove(id: string) {
    return this.prisma.bmkEntry.delete({ where: { id } });
  }

  removeByElement(elementId: string) {
    return this.prisma.bmkEntry.deleteMany({ where: { elementId } });
  }

  async findDuplicates(projectId: string) {
    const entries = await this.prisma.bmkEntry.findMany({
      where: { projectId },
    });

    const byDesignation = new Map<string, typeof entries>();
    for (const entry of entries) {
      const list = byDesignation.get(entry.fullDesignation) ?? [];
      list.push(entry);
      byDesignation.set(entry.fullDesignation, list);
    }

    const duplicates: Record<string, typeof entries> = {};
    for (const [key, list] of byDesignation) {
      if (list.length > 1) duplicates[key] = list;
    }
    return duplicates;
  }
}
