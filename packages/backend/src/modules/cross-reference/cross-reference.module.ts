import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CrossReferenceController } from "./cross-reference.controller";
import { CrossReferenceService } from "./cross-reference.service";

@Module({
  imports: [PrismaModule],
  controllers: [CrossReferenceController],
  providers: [CrossReferenceService],
  exports: [CrossReferenceService],
})
export class CrossReferenceModule {}
