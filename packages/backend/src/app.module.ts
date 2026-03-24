import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectModule } from "./modules/project/project.module";
import { PageModule } from "./modules/page/page.module";
import { ElementModule } from "./modules/element/element.module";
import { WireModule } from "./modules/wire/wire.module";
import { BmkModule } from "./modules/bmk/bmk.module";
import { CrossReferenceModule } from "./modules/cross-reference/cross-reference.module";
import { PlantModule } from "./modules/plant/plant.module";
import { LocationModule } from "./modules/location/location.module";
import { VersioningModule } from "./modules/versioning/versioning.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    PrismaModule,
    ProjectModule,
    PageModule,
    ElementModule,
    WireModule,
    BmkModule,
    CrossReferenceModule,
    PlantModule,
    LocationModule,
    VersioningModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
