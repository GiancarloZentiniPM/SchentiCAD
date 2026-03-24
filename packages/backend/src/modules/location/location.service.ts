import { Injectable, ConflictException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  findByPlant(plantId: string) {
    return this.prisma.location.findMany({
      where: { plantId },
      orderBy: { designation: "asc" },
    });
  }

  findOne(id: string) {
    return this.prisma.location.findUnique({ where: { id } });
  }

  async create(data: { plantId: string; designation: string; name: string; description?: string }) {
    if (!data.designation.startsWith("+")) {
      throw new BadRequestException('Location designation must start with "+" (IEC 81346)');
    }
    try {
      return await this.prisma.location.create({ data });
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new ConflictException(`Location "${data.designation}" already exists for this plant`);
      }
      throw e;
    }
  }

  update(id: string, data: { designation?: string; name?: string; description?: string }) {
    if (data.designation && !data.designation.startsWith("+")) {
      throw new BadRequestException('Location designation must start with "+" (IEC 81346)');
    }
    return this.prisma.location.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }
}
