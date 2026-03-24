import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { PlantService } from "./plant.service";

@Controller("api/plants")
export class PlantController {
  constructor(private readonly plantService: PlantService) {}

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.plantService.findByProject(projectId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.plantService.findOne(id);
  }

  @Post()
  create(@Body() body: { projectId: string; designation: string; name: string; description?: string }) {
    return this.plantService.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: { designation?: string; name?: string; description?: string }) {
    return this.plantService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.plantService.remove(id);
  }
}
