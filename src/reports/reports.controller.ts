import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PropertyIncomeReportDto } from './dto/property-income-report.dto';
import { PropertyInvoicesReportDto } from './dto/property-invoices-report.dto';
import { TenantInvoicesReportDto } from './dto/tenant-invoices-report.dto';
import { AllPropertiesIncomeReportDto } from './dto/all-properties-income-report.dto';
import { TotalRentOwedReportDto } from './dto/total-rent-owed-report.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('property-income')
    @ApiOperation({ summary: 'Track income over a property over a given period of time' })
    getPropertyIncomeReport(
        @CurrentUser('id') managerId: string,
        @Query() dto: PropertyIncomeReportDto,
    ) {
        return this.reportsService.getPropertyIncomeReport(managerId, dto);
    }

    @Get('property-invoices')
    @ApiOperation({ summary: 'View invoices issued for a property vs the ones paid' })
    getPropertyInvoicesReport(
        @CurrentUser('id') managerId: string,
        @Query() dto: PropertyInvoicesReportDto,
    ) {
        return this.reportsService.getPropertyInvoicesReport(managerId, dto);
    }

    @Get('tenant-invoices')
    @ApiOperation({ summary: 'View invoices issued to a tenant vs the ones paid' })
    getTenantInvoicesReport(
        @CurrentUser('id') managerId: string,
        @Query() dto: TenantInvoicesReportDto,
    ) {
        return this.reportsService.getTenantInvoicesReport(managerId, dto);
    }

    @Get('all-properties-income')
    @ApiOperation({ summary: 'Track income of all properties over a given period of time' })
    getAllPropertiesIncomeReport(
        @CurrentUser('id') managerId: string,
        @Query() dto: AllPropertiesIncomeReportDto,
    ) {
        return this.reportsService.getAllPropertiesIncomeReport(managerId, dto);
    }

    @Get('total-rent-owed')
    @ApiOperation({ summary: 'Track how much money is owed in rent overall on all properties over a given period of time' })
    getTotalRentOwedReport(
        @CurrentUser('id') managerId: string,
        @Query() dto: TotalRentOwedReportDto,
    ) {
        return this.reportsService.getTotalRentOwedReport(managerId, dto);
    }
}
