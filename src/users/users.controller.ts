import {
    Body,
    Controller,
    Get,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import {ChangePasswordDto} from './dto/change-password.dto';
import {UpdateProfileDto} from './dto/update-profile.dto';
import {UsersService} from './users.service';

@Controller({
    path: 'users',
    version: '1',
})
@UseGuards(JwtAuthGuard)

export class UsersController {
    constructor(
        private readonly usersService: UsersService,
    ) {
    }

    /**
     * Get the authenticated manager's profile.
     *
     * GET /api/v1/users/me
     */
    @Get('me')
    getProfile(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.usersService.getProfile(user.id);
    }

    /**
     * Update the authenticated manager's profile.
     *
     * PATCH /api/v1/users/me
     */
    @Patch('me')
    updateProfile(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(
            user.id,
            dto,
        );
    }

    /**
     * Change the authenticated manager's password.
     *
     * POST /api/v1/users/me/change-password
     */
    @Post('me/change-password')
    changePassword(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(
            user.id,
            dto.currentPassword,
            dto.newPassword,
        );
    }
}