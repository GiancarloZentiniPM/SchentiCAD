import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ElementService {
  constructor(private readonly prisma: PrismaService) {}

  findByPage(pageId: string) {
    return this.prisma.placedElement.findMany({
      where: { pageId },
      include: { symbol: true, bmkEntry: true },
    });
  }

  findOne(id: string) {
    return this.prisma.placedElement.findUnique({
      where: { id },
      include: { symbol: true, bmkEntry: true },
    });
  }

  create(data: {
    pageId: string;
    symbolId: string;
    x: number;
    y: number;
    rotation?: number;
    mirrored?: boolean;
    bmk?: string;
    properties?: string;
  }) {
    return this.prisma.placedElement.create({ data });
  }

  update(
    id: string,
    data: {
      x?: number;
      y?: number;
      rotation?: number;
      mirrored?: boolean;
      bmk?: string;
      properties?: string;
    },
  ) {
    return this.prisma.placedElement.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.placedElement.delete({ where: { id } });
  }

  removeMany(ids: string[]) {
    return this.prisma.placedElement.deleteMany({ where: { id: { in: ids } } });
  }
}
