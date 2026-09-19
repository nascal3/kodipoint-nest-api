import { Module } from '@nestjs/common';

import { TenanciesController } from './tenancies.controller';
import { TenanciesService } from './tenancies.service';
import {AuthModule} from "@/auth/auth.module";

@Module({
    imports: [AuthModule],
    controllers: [TenanciesController],
    providers: [TenanciesService],
    exports: [TenanciesService],
})
export class TenanciesModule {}