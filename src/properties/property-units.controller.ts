import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PropertyUnitsService } from './property-units.service';
import { CreatePropertyUnitDto } from './dto/create-property-unit.dto';
import { UpdatePropertyUnitDto } from './dto/update-property-unit.dto';
import { UpdatePropertyUnitChargeRateDto } from './dto/update-property-unit-charge-rate.dto';
import { ListPropertyUnitsDto } from './dto/list-property-units.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Property Units')
@ApiBearerAuth('access-token')
@Controller({
  path: 'properties/units',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PropertyUnitsController {
  constructor(private readonly propertyUnitsService: PropertyUnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new property unit' })
  create(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Body() dto: CreatePropertyUnitDto,
  ) {
    return this.propertyUnitsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List property units for the authenticated manager with optional filters',
  })
  findAll(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Query() query: ListPropertyUnitsDto,
  ) {
    return this.propertyUnitsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single property unit by ID' })
  @ApiParam({ name: 'id', example: 'property-unit-uuid' })
  findOne(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') unitId: string,
  ) {
    return this.propertyUnitsService.findOne(user.id, unitId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property unit' })
  @ApiParam({ name: 'id', example: 'property-unit-uuid' })
  update(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') unitId: string,
    @Body() dto: UpdatePropertyUnitDto,
  ) {
    return this.propertyUnitsService.update(user.id, unitId, dto);
  }

  @Patch(':id/charges/:propertyChargeId/rate')
  @ApiOperation({
    summary: 'Set a new effective-dated rate for a property unit charge',
  })
  updateChargeRate(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') unitId: string,
    @Param('propertyChargeId') propertyChargeId: string,
    @Body() dto: UpdatePropertyUnitChargeRateDto,
  ) {
    return this.propertyUnitsService.updateChargeRate(
      user.id,
      unitId,
      propertyChargeId,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a property unit' })
  @ApiParam({ name: 'id', example: 'property-unit-uuid' })
  archive(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') unitId: string,
  ) {
    return this.propertyUnitsService.archive(user.id, unitId);
  }
}
