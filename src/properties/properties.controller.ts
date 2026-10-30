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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ListPropertiesDto } from './dto/list-properties.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

@ApiTags('Properties')
@ApiBearerAuth('access-token')
@Controller({
    path: 'properties',
    version: '1',
})
@UseGuards(JwtAuthGuard)

export class PropertiesController {
    constructor(
        private readonly propertiesService: PropertiesService,
    ) {
    }

    @Post()
    @ApiOperation({ summary: 'Create a new property' })
    create(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: CreatePropertyDto,
    ) {
        return this.propertiesService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({
        summary: 'List properties for the authenticated manager with optional filters',
    })
    findAll(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Query() query: ListPropertiesDto,
    ) {
        return this.propertiesService.findAll(user.id, query);
    }

    @Get('portfolio-occupancy')
    @ApiOperation({ summary: 'Get portfolio occupancy statistics' })
    getPortfolioOccupancy(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.propertiesService.getPortfolioOccupancy(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single property by ID' })
    @ApiParam({ name: 'id', example: 'property-uuid' })
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') propertyId: string,
    ) {
        return this.propertiesService.findOne(user.id, propertyId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a property' })
    @ApiParam({ name: 'id', example: 'property-uuid' })
    update(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') propertyId: string,
        @Body() dto: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(
            user.id,
            propertyId,
            dto,
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Archive a property' })
    @ApiParam({ name: 'id', example: 'property-uuid' })
    archive(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') propertyId: string,
    ) {
        return this.propertiesService.archive(user.id, propertyId);
    }
}