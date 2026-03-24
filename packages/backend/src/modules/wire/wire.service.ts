import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class WireService {
  constructor(private readonly prisma: PrismaService) {}

  findByPage(pageId: string) {
    return this.prisma.wire.findMany({ where: { pageId } });
  }

  findOne(id: string) {
    return this.prisma.wire.findUnique({ where: { id } });
  }

  create(data: {
    pageId: string;
    name?: string;
    path: string;
    gauge?: string;
    color?: string;
    potential?: string;
  }) {
    return this.prisma.wire.create({ data });
  }

  update(
    id: string,
    data: {
      name?: string;
      path?: string;
      gauge?: string;
      color?: string;
      potential?: string;
    },
  ) {
    return this.prisma.wire.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.wire.delete({ where: { id } });
  }
}
