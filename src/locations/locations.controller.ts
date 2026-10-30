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

import { LocationsService } from './locations.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

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
    findAllCountries() {
        return this.locationsService.findAllCountries();
    }

    @Post('countries')
    createCountry(@Body() dto: CreateCountryDto) {
        return this.locationsService.createCountry(dto);
    }

    @Get('countries/:id')
    findOneCountry(@Param('id') countryId: string) {
        return this.locationsService.findOneCountry(countryId);
    }

    @Patch('countries/:id')
    updateCountry(
        @Param('id') countryId: string,
        @Body() dto: UpdateCountryDto,
    ) {
        return this.locationsService.updateCountry(countryId, dto);
    }

    @Delete('countries/:id')
    deleteCountry(@Param('id') countryId: string) {
        return this.locationsService.deleteCountry(countryId);
    }

    // City endpoints
    @Get('countries/:countryId/cities')
    findCitiesByCountry(@Param('countryId') countryId: string) {
        return this.locationsService.findCitiesByCountry(countryId);
    }

    @Get('cities')
    findAllCities() {
        return this.locationsService.findAllCities();
    }

    @Post('cities')
    createCity(@Body() dto: CreateCityDto) {
        return this.locationsService.createCity(dto);
    }

    @Get('cities/:id')
    findOneCity(@Param('id') cityId: string) {
        return this.locationsService.findOneCity(cityId);
    }

    @Patch('cities/:id')
    updateCity(
        @Param('id') cityId: string,
        @Body() dto: UpdateCityDto,
    ) {
        return this.locationsService.updateCity(cityId, dto);
    }

    @Delete('cities/:id')
    deleteCity(@Param('id') cityId: string) {
        return this.locationsService.deleteCity(cityId);
    }
}
