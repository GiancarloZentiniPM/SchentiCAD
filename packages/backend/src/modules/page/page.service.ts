import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PageService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string) {
    return this.prisma.page.findMany({
      where: { projectId },
      orderBy: { pageNumber: "asc" },
    });
  }

  findOne(id: string) {
    return this.prisma.page.findUnique({
      where: { id },
      include: { elements: true, wires: true },
    });
  }

  async create(data: {
    projectId: string;
    name: string;
    type?: string;
    format?: string;
    orientation?: string;
  }) {
    const lastPage = await this.prisma.page.findFirst({
      where: { projectId: data.projectId },
      orderBy: { pageNumber: "desc" },
    });
    const pageNumber = (lastPage?.pageNumber ?? 0) + 1;

    return this.prisma.page.create({
      data: { ...data, pageNumber },
    });
  }

  update(id: string, data: { name?: string; type?: string; format?: string; orientation?: string }) {
    return this.prisma.page.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.page.delete({ where: { id } });
  }
}
