import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

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
    create(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: CreatePropertyDto,
    ) {
        return this.propertiesService.create(user.id, dto);
    }

    @Get()
    findAll(@CurrentUser() user: authenticatedUserType.AuthenticatedUser) {
        return this.propertiesService.findAll(user.id);
    }

    @Get(':id')
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') propertyId: string,
    ) {
        return this.propertiesService.findOne(user.id, propertyId);
    }

    @Patch(':id')
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
    archive(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') propertyId: string,
    ) {
        return this.propertiesService.archive(user.id, propertyId);
    }
}