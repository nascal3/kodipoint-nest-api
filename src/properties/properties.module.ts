import { Module } from '@nestjs/common';

import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyUnitsController } from './property-units.controller';
import { PropertyUnitsService } from './property-units.service';
import { PropertyChargesController } from './property-charges.controller';
import { PropertyChargesService } from './property-charges.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [
    PropertyChargesController,
    PropertyUnitsController,
    PropertiesController,
  ],
  providers: [
    PropertiesService,
    PropertyUnitsService,
    PropertyChargesService,
  ],
  exports: [PropertiesService, PropertyUnitsService, PropertyChargesService],
})
export class PropertiesModule {}
