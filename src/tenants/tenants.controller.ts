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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

@ApiTags('Tenants')
@ApiBearerAuth('access-token')
@Controller({
    path: 'tenants',
    version: '1',
})
@UseGuards(JwtAuthGuard)

export class TenantsController {
    constructor(
        private readonly tenantsService: TenantsService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Create a tenant for the authenticated manager' })
    create(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: CreateTenantDto,
    ) {
        return this.tenantsService.create(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all tenants belonging to the authenticated manager' })
    findAll(@CurrentUser() user: authenticatedUserType.AuthenticatedUser) {
        return this.tenantsService.findAll(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get one tenant belonging to the authenticated manager' })
    @ApiParam({ name: 'id', example: 'tenant-uuid' })
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') tenantId: string,
    ) {
        return this.tenantsService.findOne(user.id, tenantId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update tenant details' })
    @ApiParam({ name: 'id', example: 'tenant-uuid' })
    update(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') tenantId: string,
        @Body() dto: UpdateTenantDto,
    ) {
        return this.tenantsService.update(
            user.id,
            tenantId,
            dto,
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Archive a tenant instead of physically deleting the record' })
    @ApiParam({ name: 'id', example: 'tenant-uuid' })
    archive(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') tenantId: string,
    ) {
        return this.tenantsService.archive(user.id, tenantId);
    }
}