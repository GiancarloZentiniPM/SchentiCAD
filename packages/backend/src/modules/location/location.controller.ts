import { Controller, Get, Post, Put, Delete, Param, Body, Query } from "@nestjs/common";
import { LocationService } from "./location.service";

@Controller("api/locations")
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  findByPlant(@Query("plantId") plantId: string) {
    return this.locationService.findByPlant(plantId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.locationService.findOne(id);
  }

  @Post()
  create(@Body() body: { plantId: string; designation: string; name: string; description?: string }) {
    return this.locationService.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: { designation?: string; name?: string; description?: string }) {
    return this.locationService.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.locationService.remove(id);
  }
}
