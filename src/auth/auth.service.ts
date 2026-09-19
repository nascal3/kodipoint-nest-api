import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { DatabaseService } from '@/database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type JwtPayload = {
    sub: string;
    email: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Register a new real-estate manager.
     */
    async register(dto: RegisterDto) {
        const email = dto.email.trim().toLowerCase();

        const existingUser =
            await this.prisma.db.orm.public.User
                .where({ email })
                .first();

        if (existingUser) {
            throw new ConflictException(
                'An account with this email already exists',
            );
        }

        const passwordHash = await argon2.hash(
            dto.password,
        );

        const user =
            await this.prisma.db.orm.public.User.create({
                email,
                passwordHash,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                phone: dto.phone.trim(),
            });

        return {
            user: this.toSafeUser(user),
            ...this.createTokens(user.id, user.email),
        };
    }

    /**
     * Validate login credentials.
     *
     * This method is used by the login flow and can also be
     * called by a local Passport strategy.
     */
    async validateUser(email: string, password: string,) {
        const normalizedEmail = email
            .trim()
            .toLowerCase();

        const user =
            await this.prisma.db.orm.public.User
                .where({
                    email: normalizedEmail,
                })
                .first();

        if (!user) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        const passwordMatches = await argon2.verify(
            user.passwordHash,
            password,
        );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Invalid email or password',
            );
        }

        return user;
    }

    /**
     * Log in an existing manager.
     */
    async login(dto: LoginDto) {
        const user = await this.validateUser(
            dto.email,
            dto.password,
        );

        return {
            user: this.toSafeUser(user),
            ...this.createTokens(user.id, user.email),
        };
    }

    /**
     * Create the JWT payload and access token.
     */
    private createTokens(
        userId: string,
        email: string,
    ) {
        const payload: JwtPayload = {
            sub: userId,
            email,
        };

        const expiresIn =
            this.configService.get<string>(
                'JWT_EXPIRES_IN',
                '15m',
            );

        return {
            accessToken: this.jwtService.sign(payload, {
                secret: this.getJwtSecret(),
                expiresIn: expiresIn as any,
            }),
        };
    }

    /**
     * Remove sensitive fields before returning a user.
     */
    private toSafeUser<
        T extends {
            passwordHash: string;
        },
    >(user: T) {
        const {
            passwordHash: _passwordHash,
            ...safeUser
        } = user;

        return safeUser;
    }

    private getJwtSecret(): string {
        const secret =
            this.configService.get<string>('JWT_SECRET');

        if (!secret) {
            throw new Error(
                'JWT_SECRET is not configured',
            );
        }

        return secret;
    }
}