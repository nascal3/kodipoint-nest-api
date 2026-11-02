import { Module } from '@nestjs/common';

import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyUnitsController } from './property-units.controller';
import { PropertyUnitsService } from './property-units.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PropertiesController, PropertyUnitsController],
  providers: [PropertiesService, PropertyUnitsService],
  exports: [PropertiesService, PropertyUnitsService],
})
export class PropertiesModule {}
