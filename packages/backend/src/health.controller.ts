import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: "ok",
      app: "SchentiCAD Backend",
      version: "0.1.0",
    };
  }
}
