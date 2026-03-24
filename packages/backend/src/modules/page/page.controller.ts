import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { PageService } from "./page.service";

@Controller("api/pages")
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.pageService.findByProject(projectId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.pageService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      projectId: string;
      name: string;
      type?: string;
      format?: string;
      orientation?: string;
    },
  ) {
    return this.pageService.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; type?: string; format?: string; orientation?: string },
  ) {
    return this.pageService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.pageService.remove(id);
  }
}
