import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { BmkService } from "./bmk.service";

@Controller("api/bmk")
export class BmkController {
  constructor(private readonly bmkService: BmkService) {}

  @Get()
  findByProject(@Query("projectId") projectId: string) {
    return this.bmkService.findByProject(projectId);
  }

  @Get("duplicates")
  findDuplicates(@Query("projectId") projectId: string) {
    return this.bmkService.findDuplicates(projectId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.bmkService.findOne(id);
  }

  @Post("allocate")
  allocate(
    @Body()
    body: {
      projectId: string;
      prefix: string;
      elementId: string;
      plantDesignation?: string;
      locationDesignation?: string;
    },
  ) {
    return this.bmkService.allocate(body);
  }

  @Put(":id/rename")
  rename(@Param("id") id: string, @Body("designation") designation: string) {
    return this.bmkService.rename(id, designation);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.bmkService.remove(id);
  }
}
