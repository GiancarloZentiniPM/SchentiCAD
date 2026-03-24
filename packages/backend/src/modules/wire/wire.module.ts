import { Module } from "@nestjs/common";
import { WireController } from "./wire.controller";
import { WireService } from "./wire.service";

@Module({
  controllers: [WireController],
  providers: [WireService],
  exports: [WireService],
})
export class WireModule {}
