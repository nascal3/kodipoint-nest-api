import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenanciesService } from './tenancies.service';
import { AssignTenantDto } from './dto/assign-tenant.dto';
import { UnassignTenantDto } from './dto/unassign-tenant.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

@Controller({
    path: 'tenancies',
    version: '1',
})
@UseGuards(JwtAuthGuard)

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
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
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
    findAll(@CurrentUser() user: authenticatedUserType.AuthenticatedUser) {
        return this.tenanciesService.findAll(user.id);
    }

    /**
     * Get a single tenancy.
     *
     * GET /api/v1/tenancies/:id
     */
    @Get(':id')
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
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
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') tenancyId: string,
        @Body() dto: UnassignTenantDto,
    ) {
        return this.tenanciesService.unassign(
            user.id,
            tenancyId,
            new Date(dto.endDate),
        );
    }
}