import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });
  }

  create(data: { name: string; company?: string; creator?: string; description?: string }) {
    return this.prisma.project.create({ data });
  }

  update(id: string, data: { name?: string; company?: string; creator?: string; description?: string }) {
    return this.prisma.project.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }
}
