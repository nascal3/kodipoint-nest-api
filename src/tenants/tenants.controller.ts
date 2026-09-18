import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

type AuthenticatedUser = {
    id: string;
    email?: string;
};

@Controller({
    path: 'tenants',
    version: '1',
})
export class TenantsController {
    constructor(
        private readonly tenantsService: TenantsService,
    ) {}

    /**
     * Create a tenant for the authenticated manager.
     *
     * POST /api/v1/tenants
     */
    @Post()
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateTenantDto,
    ) {
        return this.tenantsService.create(user.id, dto);
    }

    /**
     * List all tenants belonging to the authenticated manager.
     *
     * GET /api/v1/tenants
     */
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.tenantsService.findAll(user.id);
    }

    /**
     * Get one tenant belonging to the authenticated manager.
     *
     * GET /api/v1/tenants/:id
     */
    @Get(':id')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') tenantId: string,
    ) {
        return this.tenantsService.findOne(user.id, tenantId);
    }

    /**
     * Update tenant details.
     *
     * PATCH /api/v1/tenants/:id
     */
    @Patch(':id')
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') tenantId: string,
        @Body() dto: UpdateTenantDto,
    ) {
        return this.tenantsService.update(
            user.id,
            tenantId,
            dto,
        );
    }

    /**
     * Archive a tenant instead of physically deleting the record.
     *
     * DELETE /api/v1/tenants/:id
     */
    @Delete(':id')
    archive(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') tenantId: string,
    ) {
        return this.tenantsService.archive(user.id, tenantId);
    }
}