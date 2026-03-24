import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { CrossReferenceService } from "./cross-reference.service";

@Controller("api/cross-references")
export class CrossReferenceController {
  constructor(private readonly crossRefService: CrossReferenceService) {}

  @Get()
  find(
    @Query("projectId") projectId?: string,
    @Query("pageId") pageId?: string,
    @Query("elementId") elementId?: string,
  ) {
    if (elementId) return this.crossRefService.findByElement(elementId);
    if (pageId) return this.crossRefService.findByPage(pageId);
    if (projectId) return this.crossRefService.findByProject(projectId);
    return [];
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.crossRefService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      projectId: string;
      sourcePageId: string;
      sourceElementId: string;
      sourceX: number;
      sourceY: number;
      targetPageId: string;
      targetElementId: string;
      targetX: number;
      targetY: number;
      label?: string;
    },
  ) {
    return this.crossRefService.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: { label?: string; sourceX?: number; sourceY?: number; targetX?: number; targetY?: number },
  ) {
    return this.crossRefService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.crossRefService.remove(id);
  }
}
