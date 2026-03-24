import { Controller, Get, Post, Put, Delete, Param, Body } from "@nestjs/common";
import { ProjectService } from "./project.service";

@Controller("api/projects")
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  findAll() {
    return this.projectService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.projectService.findOne(id);
  }

  @Post()
  create(@Body() body: { name: string; company?: string; creator?: string; description?: string }) {
    return this.projectService.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: { name?: string; company?: string; creator?: string; description?: string },
  ) {
    return this.projectService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.projectService.remove(id);
  }
}
