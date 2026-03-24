import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { WireService } from "./wire.service";

@Controller("api/wires")
export class WireController {
  constructor(private readonly wireService: WireService) {}

  @Get()
  findByPage(@Query("pageId") pageId: string) {
    return this.wireService.findByPage(pageId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.wireService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      pageId: string;
      name?: string;
      path: string;
      gauge?: string;
      color?: string;
      potential?: string;
    },
  ) {
    return this.wireService.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; path?: string; gauge?: string; color?: string; potential?: string },
  ) {
    return this.wireService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.wireService.remove(id);
  }
}
