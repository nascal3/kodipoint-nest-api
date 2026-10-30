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

import { LocationsService } from './locations.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@ApiTags('Locations')
@ApiBearerAuth('access-token')
@Controller({
    path: 'locations',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class LocationsController {
    constructor(
        private readonly locationsService: LocationsService,
    ) {}

    // Country endpoints
    @Get('countries')
    @ApiOperation({ summary: 'Fetch all countries' })
    findAllCountries() {
        return this.locationsService.findAllCountries();
    }

    @Post('countries')
    @ApiOperation({ summary: 'Add a new country (prevents duplicate country names)' })
    createCountry(@Body() dto: CreateCountryDto) {
        return this.locationsService.createCountry(dto);
    }

    @Get('countries/:id')
    @ApiOperation({ summary: 'Fetch a single country by ID' })
    @ApiParam({ name: 'id', example: 'country-uuid' })
    findOneCountry(@Param('id') countryId: string) {
        return this.locationsService.findOneCountry(countryId);
    }

    @Patch('countries/:id')
    @ApiOperation({ summary: 'Edit a country name (prevents duplicate country names)' })
    @ApiParam({ name: 'id', example: 'country-uuid' })
    updateCountry(
        @Param('id') countryId: string,
        @Body() dto: UpdateCountryDto,
    ) {
        return this.locationsService.updateCountry(countryId, dto);
    }

    @Delete('countries/:id')
    @ApiOperation({ summary: 'Delete a country (deletes all cities under that country)' })
    @ApiParam({ name: 'id', example: 'country-uuid' })
    deleteCountry(@Param('id') countryId: string) {
        return this.locationsService.deleteCountry(countryId);
    }

    // City endpoints
    @Get('countries/:countryId/cities')
    @ApiOperation({ summary: 'Fetch all cities registered under a country' })
    @ApiParam({ name: 'countryId', example: 'country-uuid' })
    findCitiesByCountry(@Param('countryId') countryId: string) {
        return this.locationsService.findCitiesByCountry(countryId);
    }

    @Get('cities')
    @ApiOperation({ summary: 'Fetch all cities' })
    findAllCities() {
        return this.locationsService.findAllCities();
    }

    @Post('cities')
    @ApiOperation({ summary: 'Add a new city to a country (prevents duplicate city names)' })
    createCity(@Body() dto: CreateCityDto) {
        return this.locationsService.createCity(dto);
    }

    @Get('cities/:id')
    @ApiOperation({ summary: 'Fetch a single city by ID' })
    @ApiParam({ name: 'id', example: 'city-uuid' })
    findOneCity(@Param('id') cityId: string) {
        return this.locationsService.findOneCity(cityId);
    }

    @Patch('cities/:id')
    @ApiOperation({ summary: 'Edit a city name (prevents duplicate city names)' })
    @ApiParam({ name: 'id', example: 'city-uuid' })
    updateCity(
        @Param('id') cityId: string,
        @Body() dto: UpdateCityDto,
    ) {
        return this.locationsService.updateCity(cityId, dto);
    }

    @Delete('cities/:id')
    @ApiOperation({ summary: 'Delete a city' })
    @ApiParam({ name: 'id', example: 'city-uuid' })
    deleteCity(@Param('id') cityId: string) {
        return this.locationsService.deleteCity(cityId);
    }
}
