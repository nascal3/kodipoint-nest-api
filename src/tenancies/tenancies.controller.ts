import {
    Body,
    Controller,
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
import { TenanciesService } from './tenancies.service';
import { AssignTenantDto } from './dto/assign-tenant.dto';
import { UnassignTenantDto } from './dto/unassign-tenant.dto';
import * as authenticatedUserType from '../common/types/authenticated-user.type';
import {JwtAuthGuard} from "@/common/guards/jwt-auth.guard";

@ApiTags('Tenancies')
@ApiBearerAuth('access-token')
@Controller({
    path: 'tenancies',
    version: '1',
})
@UseGuards(JwtAuthGuard)

export class TenanciesController {
    constructor(
        private readonly tenanciesService: TenanciesService,
    ) {}

    @Post()
    @ApiOperation({ summary: 'Assign a tenant to a property' })
    assign(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: AssignTenantDto,
    ) {
        return this.tenanciesService.assign(user.id, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List active and historical tenancies' })
    findAll(@CurrentUser() user: authenticatedUserType.AuthenticatedUser) {
        return this.tenanciesService.findAll(user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single tenancy' })
    @ApiParam({ name: 'id', example: 'tenancy-uuid' })
    findOne(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Param('id') tenancyId: string,
    ) {
        return this.tenanciesService.findOne(user.id, tenancyId);
    }

    @Patch(':id/unassign')
    @ApiOperation({ summary: 'End an active tenancy' })
    @ApiParam({ name: 'id', example: 'tenancy-uuid' })
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