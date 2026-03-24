import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectModule } from "./modules/project/project.module";
import { PageModule } from "./modules/page/page.module";
import { ElementModule } from "./modules/element/element.module";
import { WireModule } from "./modules/wire/wire.module";
import { BmkModule } from "./modules/bmk/bmk.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PrismaModule, ProjectModule, PageModule, ElementModule, WireModule, BmkModule],
  controllers: [HealthController],
})
export class AppModule {}
