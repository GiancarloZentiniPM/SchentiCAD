import { Module } from "@nestjs/common";
import { BmkController } from "./bmk.controller";
import { BmkService } from "./bmk.service";

@Module({
  controllers: [BmkController],
  providers: [BmkService],
  exports: [BmkService],
})
export class BmkModule {}
