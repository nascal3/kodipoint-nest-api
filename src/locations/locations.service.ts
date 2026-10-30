import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { and, not } from '@prisma/orm-postgres/orm-client';

import { DatabaseService } from '@/database/database.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';

@Injectable()
export class LocationsService {
    constructor(private readonly prisma: DatabaseService) {}

    // Country CRUD operations
    async createCountry(dto: CreateCountryDto) {
        const existingCountry = await this.prisma.db.orm.public.Country
            .where({ name: dto.name })
            .first();

        if (existingCountry) {
            throw new ConflictException('Country with this name already exists');
        }

        return this.prisma.db.orm.public.Country.create({
            name: dto.name,
        });
    }

    async findAllCountries() {
        return this.prisma.db.orm.public.Country.all();
    }

    async findOneCountry(countryId: string) {
        const country = await this.prisma.db.orm.public.Country
            .where({ id: countryId })
            .first();

        if (!country) {
            throw new NotFoundException('Country not found');
        }

        return country;
    }

    async updateCountry(countryId: string, dto: UpdateCountryDto) {
        await this.findOneCountry(countryId);

        if (dto.name) {
            const name = dto.name;
            const existingCountry = await this.prisma.db.orm.public.Country
                .where((country) =>
                    and(country.name.eq(name), not(country.id.eq(countryId))),
                )
                .first();

            if (existingCountry) {
                throw new ConflictException('Country with this name already exists');
            }
        }

        return this.prisma.db.orm.public.Country
            .where({ id: countryId })
            .update(dto);
    }

    async deleteCountry(countryId: string) {
        await this.findOneCountry(countryId);

        return this.prisma.db.orm.public.Country
            .where({ id: countryId })
            .delete();
    }

    // City CRUD operations
    async createCity(dto: CreateCityDto) {
        await this.findOneCountry(dto.countryId);

        const existingCity = await this.prisma.db.orm.public.City
            .where({
                name: dto.name,
                countryId: dto.countryId,
            })
            .first();

        if (existingCity) {
            throw new ConflictException('City with this name already exists in this country');
        }

        return this.prisma.db.orm.public.City.create({
            name: dto.name,
            countryId: dto.countryId,
        });
    }

    async findCitiesByCountry(countryId: string) {
        await this.findOneCountry(countryId);

        return this.prisma.db.orm.public.City
            .where({ countryId })
            .all();
    }

    async findAllCities() {
        return this.prisma.db.orm.public.City.all();
    }

    async findOneCity(cityId: string) {
        const city = await this.prisma.db.orm.public.City
            .where({ id: cityId })
            .first();

        if (!city) {
            throw new NotFoundException('City not found');
        }

        return city;
    }

    async updateCity(cityId: string, dto: UpdateCityDto) {
        const city = await this.findOneCity(cityId);

        if (dto.countryId) {
            await this.findOneCountry(dto.countryId);
        }

        if (dto.name) {
            const name = dto.name;
            const countryId = dto.countryId ?? city.countryId!;
            const existingCity = await this.prisma.db.orm.public.City
                .where((city) =>
                    and(
                        city.name.eq(name),
                        city.countryId.eq(countryId),
                        not(city.id.eq(cityId)),
                    ),
                )
                .first();

            if (existingCity) {
                throw new ConflictException('City with this name already exists in this country');
            }
        }

        return this.prisma.db.orm.public.City
            .where({ id: cityId })
            .update(dto);
    }

    async deleteCity(cityId: string) {
        await this.findOneCity(cityId);

        return this.prisma.db.orm.public.City
            .where({ id: cityId })
            .delete();
    }
}
