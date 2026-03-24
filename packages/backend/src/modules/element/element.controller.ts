import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { ElementService } from "./element.service";

@Controller("api/elements")
export class ElementController {
  constructor(private readonly elementService: ElementService) {}

  @Get()
  findByPage(@Query("pageId") pageId: string) {
    return this.elementService.findByPage(pageId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.elementService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      pageId: string;
      symbolId: string;
      x: number;
      y: number;
      rotation?: number;
      mirrored?: boolean;
      bmk?: string;
      properties?: string;
    },
  ) {
    return this.elementService.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body()
    body: {
      x?: number;
      y?: number;
      rotation?: number;
      mirrored?: boolean;
      bmk?: string;
      properties?: string;
    },
  ) {
    return this.elementService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.elementService.remove(id);
  }
}
