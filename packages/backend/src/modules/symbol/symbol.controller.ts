import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { SymbolService } from "./symbol.service";

@Controller("api/symbols")
export class SymbolController {
  constructor(private readonly svc: SymbolService) {}

  @Get()
  list(@Query("category") category?: string) {
    if (category) return this.svc.findByCategory(category);
    return this.svc.findAll();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.findById(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      category: string;
      geometry: string;
      connectionPoints: string;
      width: number;
      height: number;
      description?: string;
    },
  ) {
    return this.svc.create(body);
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      geometry?: string;
      connectionPoints?: string;
      width?: number;
      height?: number;
      description?: string;
    },
  ) {
    return this.svc.update(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.svc.delete(id);
  }
}
