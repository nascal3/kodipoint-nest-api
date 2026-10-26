import {
    BadRequestException,
    ConflictException,
    Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { DatabaseService } from '@/database/database.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {Temporal} from "@js-temporal/polyfill";

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
                address: dto.address.trim(),
                phone: dto.phone.trim(),
                organization: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
                billingAddress: dto.address?.trim(),
                billingEmail: email,
                passwordUpdatedAt: Temporal.Now.instant(),
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
            throw new BadRequestException({
                message: 'Wrong Email or Password',
                details: 'Wrong Email or Password',
            });
        }

        const passwordMatches = await argon2.verify(
            user.passwordHash,
            password,
        );

        if (!passwordMatches) {
            throw new BadRequestException({
                message: 'Wrong Email or Password',
                details: 'Wrong Email or Password',
            });
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
    private createTokens(userId: string, email: string,) {
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
     * Find or create a user authenticated through Google OAuth.
     *
     * Google email must be verified before calling this method.
     */
    async validateGoogleUser(profile: {
        googleId: string;
        email: string;
        firstName: string;
        lastName: string;
        picture?: string;
    }) {
        const email = profile.email.trim().toLowerCase();

        // 1. Check whether this Google account is already linked.
        const existingOAuthAccount =
            await this.prisma.db.orm.public.OAuthAccount
                .where({
                    provider: 'google',
                    providerAccountId: profile.googleId,
                })
                .first();

        if (existingOAuthAccount) {
            const user =
                await this.prisma.db.orm.public.User
                    .where({
                        id: existingOAuthAccount.userId,
                    })
                    .first();

            if (!user) {
                throw new UnauthorizedException(
                    'The Google account is linked to a missing user',
                );
            }

            return user;
        }

        // 2. Check whether a user already exists with this email.
        const existingUser =
            await this.prisma.db.orm.public.User
                .where({ email })
                .first();

        if (existingUser) {
            // Link Google to the existing user.
            await this.prisma.db.orm.public.OAuthAccount.create({
                userId: existingUser.id,
                provider: 'google',
                providerAccountId: profile.googleId,
            });

            return existingUser;
        }

        // 3. Create a new user.
        const firstName = profile.firstName.trim();
        const lastName = profile.lastName.trim();

        // Generate an unusable-by-the-user password for an
        // OAuth-only account, assuming passwordHash is required.
        const passwordHash = await argon2.hash(
            require('node:crypto').randomBytes(32).toString('hex'),
        );

        const user =
            await this.prisma.db.orm.public.User.create({
                email,
                passwordHash,
                firstName,
                lastName,
                address: '',
                phone: '',
                organization: `${firstName} ${lastName}`,
                billingAddress: '',
                billingEmail: email,
                passwordUpdatedAt: Temporal.Now.instant(),
            });

        // 4. Link the new user to the Google account.
        await this.prisma.db.orm.public.OAuthAccount.create({
            userId: user.id,
            provider: 'google',
            providerAccountId: profile.googleId,
        });

        return user;
    }

    /**
     * Log in an existing user authenticated through Google OAuth.
     */
    async loginWithGoogle(profile: {
        googleId: string;
        email: string;
        firstName: string;
        lastName: string;
        picture?: string;
    }) {
        const user = await this.validateGoogleUser(profile);

        return {
            user: this.toSafeUser(user),
            ...this.createTokens(user.id, user.email),
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