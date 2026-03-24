import { Injectable, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PlantService {
  constructor(private readonly prisma: PrismaService) {}

  findByProject(projectId: string) {
    return this.prisma.plant.findMany({
      where: { projectId },
      include: { locations: true },
      orderBy: { designation: "asc" },
    });
  }

  findOne(id: string) {
    return this.prisma.plant.findUnique({
      where: { id },
      include: { locations: true },
    });
  }

  async create(data: { projectId: string; designation: string; name: string; description?: string }) {
    if (!data.designation.startsWith("==")) {
      throw new BadRequestException('Plant designation must start with "==" (IEC 81346)');
    }
    try {
      return await this.prisma.plant.create({ data });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException(`Plant "${data.designation}" already exists in this project`);
      }
      throw e;
    }
  }

  update(id: string, data: { designation?: string; name?: string; description?: string }) {
    if (data.designation && !data.designation.startsWith("==")) {
      throw new BadRequestException('Plant designation must start with "==" (IEC 81346)');
    }
    return this.prisma.plant.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.plant.delete({ where: { id } });
  }
}
