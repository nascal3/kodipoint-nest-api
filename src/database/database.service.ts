import {
    Injectable,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { db } from '../prisma/db';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy{
    readonly db = db;

    async onModuleInit(): Promise<void> {
        await this.db.connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.db.close();
    }
}