import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CrossReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string) {
    return this.prisma.crossReference.findMany({
      where: { projectId },
      include: {
        sourcePage: { select: { id: true, name: true, pageNumber: true } },
        targetPage: { select: { id: true, name: true, pageNumber: true } },
      },
    });
  }

  findByPage(pageId: string) {
    return this.prisma.crossReference.findMany({
      where: {
        OR: [{ sourcePageId: pageId }, { targetPageId: pageId }],
      },
    });
  }

  findByElement(elementId: string) {
    return this.prisma.crossReference.findMany({
      where: {
        OR: [{ sourceElementId: elementId }, { targetElementId: elementId }],
      },
    });
  }

  findOne(id: string) {
    return this.prisma.crossReference.findUnique({ where: { id } });
  }

  create(data: {
    projectId: string;
    sourcePageId: string;
    sourceElementId: string;
    sourceX: number;
    sourceY: number;
    targetPageId: string;
    targetElementId: string;
    targetX: number;
    targetY: number;
    label?: string;
  }) {
    return this.prisma.crossReference.create({ data });
  }

  update(
    id: string,
    data: {
      label?: string;
      sourceX?: number;
      sourceY?: number;
      targetX?: number;
      targetY?: number;
    },
  ) {
    return this.prisma.crossReference.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.crossReference.delete({ where: { id } });
  }

  removeByElement(elementId: string) {
    return this.prisma.crossReference.deleteMany({
      where: {
        OR: [{ sourceElementId: elementId }, { targetElementId: elementId }],
      },
    });
  }
}
