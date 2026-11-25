import {
  Injectable,
  Logger,
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
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly prisma: DatabaseService) {}

  // Country CRUD operations
  async createCountry(dto: CreateCountryDto) {
    const existingCountry = await this.prisma.db.orm.public.Country.where({
      name: dto.name,
    }).first();

    if (existingCountry) {
      this.logger.warn(
        `Create country rejected: name "${dto.name}" already exists`,
      );
      throw new ConflictException('Country with this name already exists');
    }

    const country = await this.prisma.db.orm.public.Country.create({
      name: dto.name,
    });

    this.logger.log(`Country created: id=${country.id} name="${country.name}"`);

    return country;
  }

  async findAllCountries() {
    return this.prisma.db.orm.public.Country.all();
  }

  async findOneCountry(countryId: string) {
    const country = await this.prisma.db.orm.public.Country.where({
      id: countryId,
    }).first();

    if (!country) {
      this.logger.warn(`Country lookup failed: id=${countryId} not found`);
      throw new NotFoundException('Country not found');
    }

    return country;
  }

  async updateCountry(countryId: string, dto: UpdateCountryDto) {
    await this.findOneCountry(countryId);

    if (dto.name) {
      const name = dto.name;
      const existingCountry = await this.prisma.db.orm.public.Country.where(
        (country) => and(country.name.eq(name), not(country.id.eq(countryId))),
      ).first();

      if (existingCountry) {
        this.logger.warn(
          `Update country ${countryId} rejected: name "${dto.name}" already exists`,
        );
        throw new ConflictException('Country with this name already exists');
      }
    }

    const updated = await this.prisma.db.orm.public.Country.where({
      id: countryId,
    }).update(dto);

    this.logger.log(`Country updated: id=${countryId}`);

    return updated;
  }

  async deleteCountry(countryId: string) {
    await this.findOneCountry(countryId);

    const deleted = await this.prisma.db.orm.public.Country.where({
      id: countryId,
    }).delete();

    this.logger.log(`Country deleted: id=${countryId}`);

    return deleted;
  }

  // City CRUD operations
  async createCity(dto: CreateCityDto) {
    await this.findOneCountry(dto.countryId);

    const existingCity = await this.prisma.db.orm.public.City.where({
      name: dto.name,
      countryId: dto.countryId,
    }).first();

    if (existingCity) {
      this.logger.warn(
        `Create city rejected: name "${dto.name}" already exists in country ${dto.countryId}`,
      );
      throw new ConflictException(
        'City with this name already exists in this country',
      );
    }

    const city = await this.prisma.db.orm.public.City.create({
      name: dto.name,
      countryId: dto.countryId,
    });

    this.logger.log(
      `City created: id=${city.id} name="${city.name}" countryId=${city.countryId}`,
    );

    return city;
  }

  async findCitiesByCountry(countryId: string) {
    await this.findOneCountry(countryId);

    return this.prisma.db.orm.public.City.where({ countryId }).all();
  }

  async findAllCities() {
    return this.prisma.db.orm.public.City.all();
  }

  async findOneCity(cityId: string) {
    const city = await this.prisma.db.orm.public.City.where({
      id: cityId,
    }).first();

    if (!city) {
      this.logger.warn(`City lookup failed: id=${cityId} not found`);
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
      const existingCity = await this.prisma.db.orm.public.City.where((city) =>
        and(
          city.name.eq(name),
          city.countryId.eq(countryId),
          not(city.id.eq(cityId)),
        ),
      ).first();

      if (existingCity) {
        this.logger.warn(
          `Update city ${cityId} rejected: name "${dto.name}" already exists in country ${countryId}`,
        );
        throw new ConflictException(
          'City with this name already exists in this country',
        );
      }
    }

    const updated = await this.prisma.db.orm.public.City.where({
      id: cityId,
    }).update(dto);

    this.logger.log(`City updated: id=${cityId}`);

    return updated;
  }

  async deleteCity(cityId: string) {
    await this.findOneCity(cityId);

    const deleted = await this.prisma.db.orm.public.City.where({
      id: cityId,
    }).delete();

    this.logger.log(`City deleted: id=${cityId}`);

    return deleted;
  }
}
