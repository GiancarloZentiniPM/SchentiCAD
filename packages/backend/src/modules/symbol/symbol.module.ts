import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { SymbolController } from "./symbol.controller";
import { SymbolService } from "./symbol.service";

@Module({
  imports: [PrismaModule],
  controllers: [SymbolController],
  providers: [SymbolService],
  exports: [SymbolService],
})
export class SymbolModule {}
