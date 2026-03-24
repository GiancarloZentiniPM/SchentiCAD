import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SymbolService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.symbolDefinition.findMany({
      orderBy: { name: "asc" },
    });
  }

  findById(id: string) {
    return this.prisma.symbolDefinition.findUnique({ where: { id } });
  }

  findByCategory(category: string) {
    return this.prisma.symbolDefinition.findMany({
      where: { category },
      orderBy: { name: "asc" },
    });
  }

  create(data: {
    name: string;
    category: string;
    geometry: string;
    connectionPoints: string;
    width: number;
    height: number;
    description?: string;
  }) {
    return this.prisma.symbolDefinition.create({ data });
  }

  update(
    id: string,
    data: {
      name?: string;
      category?: string;
      geometry?: string;
      connectionPoints?: string;
      width?: number;
      height?: number;
      description?: string;
    },
  ) {
    return this.prisma.symbolDefinition.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.symbolDefinition.delete({ where: { id } });
  }
}
