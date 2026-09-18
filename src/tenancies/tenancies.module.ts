import { Module } from '@nestjs/common';

import { TenanciesController } from './tenancies.controller';
import { TenanciesService } from './tenancies.service';

@Module({
    controllers: [TenanciesController],
    providers: [TenanciesService],
    exports: [TenanciesService],
})
export class TenanciesModule {}