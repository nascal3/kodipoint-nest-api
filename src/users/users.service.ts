import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';

import { DatabaseService } from '@/database/database.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: DatabaseService,
    ) {}

    /**
     * Get the authenticated manager's profile.
     */
    async getProfile(managerId: string) {
        const user =
            await this.prisma.db.orm.public.User
                .where({
                    id: managerId,
                })
                .first();

        if (!user) {
            throw new NotFoundException(
                'User profile not found',
            );
        }

        return this.toSafeUser(user);
    }

    /**
     * Update the authenticated manager's profile.
     */
    async updateProfile(managerId: string, dto: UpdateProfileDto,) {
        const currentUser =
            await this.prisma.db.orm.public.User
                .where({
                    id: managerId,
                })
                .first();

        if (!currentUser) {
            throw new NotFoundException(
                'User profile not found',
            );
        }

        const updateData: Record<string, unknown> = {};

        if (dto.email !== undefined) {
            const email = dto.email
                .trim()
                .toLowerCase();

            const existingUser =
                await this.prisma.db.orm.public.User
                    .where({
                        email,
                    })
                    .first();

            if (
                existingUser &&
                existingUser.id !== managerId
            ) {
                throw new ConflictException(
                    'This email is already in use',
                );
            }

            updateData.email = email;
        }

        if (dto.firstName !== undefined) {
            updateData.firstName = dto.firstName.trim();
        }

        if (dto.lastName !== undefined) {
            updateData.lastName = dto.lastName.trim();
        }

        if (dto.phone !== undefined) {
            updateData.phone = dto.phone.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return this.toSafeUser(currentUser);
        }

        const updatedUser =
            await this.prisma.db.orm.public.User
                .where({
                    id: managerId,
                })
                .update(updateData);

        if (!updatedUser) {
            throw new NotFoundException(
                'User profile not found',
            );
        }

        return this.toSafeUser(updatedUser);
    }

    /**
     * Change the authenticated manager's password.
     */
    async changePassword(
        managerId: string,
        currentPassword: string,
        newPassword: string,
    ) {
        const user =
            await this.prisma.db.orm.public.User
                .where({
                    id: managerId,
                })
                .first();

        if (!user) {
            throw new NotFoundException(
                'User profile not found',
            );
        }

        const passwordMatches =
            await argon2.verify(
                user.passwordHash,
                currentPassword,
            );

        if (!passwordMatches) {
            throw new UnauthorizedException(
                'Current password is incorrect',
            );
        }

        const passwordHash = await argon2.hash(
            newPassword,
        );

        const updatedUser =
            await this.prisma.db.orm.public.User
                .where({
                    id: managerId,
                })
                .update({
                    passwordHash,
                });

        if (!updatedUser) {
            throw new NotFoundException(
                'User profile not found',
            );
        }

        return this.toSafeUser(updatedUser);
    }

    /**
     * Deactivate the authenticated manager account.
     *
     * Your current User model does not contain a status
     * field, so this method is intentionally not included.
     * Add a status field to the contract before enabling
     * account deactivation.
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
}