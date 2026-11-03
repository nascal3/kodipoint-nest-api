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
import { PropertyChargesService } from './property-charges.service';
import { CreatePropertyChargesDto } from './dto/create-property-charges.dto';
import { UpdatePropertyChargeDto } from './dto/update-property-charge.dto';
import { ListPropertyChargesDto } from './dto/list-property-charges.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Property Charges')
@ApiBearerAuth('access-token')
@Controller({
  path: 'properties/charges',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class PropertyChargesController {
  constructor(private readonly propertyChargesService: PropertyChargesService) {}

  @Post()
  @ApiOperation({ summary: 'Create one or more property charges' })
  create(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Body() dto: CreatePropertyChargesDto,
  ) {
    return this.propertyChargesService.createMany(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List property charges for the authenticated manager with optional filters',
  })
  findAll(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Query() query: ListPropertyChargesDto,
  ) {
    return this.propertyChargesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single property charge by ID' })
  @ApiParam({ name: 'id', example: 'property-charge-uuid' })
  findOne(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') chargeId: string,
  ) {
    return this.propertyChargesService.findOne(user.id, chargeId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property charge' })
  @ApiParam({ name: 'id', example: 'property-charge-uuid' })
  update(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') chargeId: string,
    @Body() dto: UpdatePropertyChargeDto,
  ) {
    return this.propertyChargesService.update(user.id, chargeId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a property charge (set isActive to false)' })
  @ApiParam({ name: 'id', example: 'property-charge-uuid' })
  archive(
    @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    @Param('id') chargeId: string,
  ) {
    return this.propertyChargesService.archive(user.id, chargeId);
  }
}
