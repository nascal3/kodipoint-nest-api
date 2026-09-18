import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenanciesService } from './tenancies.service';
import { AssignTenantDto } from './dto/assign-tenant.dto';
import { UnassignTenantDto } from './dto/unassign-tenant.dto';

type AuthenticatedUser = {
    id: string;
    email?: string;
};

@Controller({
    path: 'tenancies',
    version: '1',
})
export class TenanciesController {
    constructor(
        private readonly tenanciesService: TenanciesService,
    ) {}

    /**
     * Assign a tenant to a property.
     *
     * POST /api/v1/tenancies
     */
    @Post()
    assign(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: AssignTenantDto,
    ) {
        return this.tenanciesService.assign(user.id, dto);
    }

    /**
     * List active and historical tenancies.
     *
     * GET /api/v1/tenancies
     */
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.tenanciesService.findAll(user.id);
    }

    /**
     * Get a single tenancy.
     *
     * GET /api/v1/tenancies/:id
     */
    @Get(':id')
    findOne(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') tenancyId: string,
    ) {
        return this.tenanciesService.findOne(user.id, tenancyId);
    }

    /**
     * End an active tenancy.
     *
     * PATCH /api/v1/tenancies/:id/unassign
     */
    @Patch(':id/unassign')
    unassign(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id') tenancyId: string,
        @Body() dto: UnassignTenantDto,
    ) {
        return this.tenanciesService.unassign(
            user.id,
            tenancyId,
            dto.endDate,
        );
    }
}