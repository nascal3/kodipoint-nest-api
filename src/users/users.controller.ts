import {
    Body,
    Controller,
    Get,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import * as authenticatedUserType from '@/common/types/authenticated-user.type';

import {ChangePasswordDto} from './dto/change-password.dto';
import {UpdateProfileDto} from './dto/update-profile.dto';
import {UsersService} from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
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

    @Get('me')
    @ApiOperation({ summary: 'Get the authenticated manager\'s profile' })
    getProfile(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
    ) {
        return this.usersService.getProfile(user.id);
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update the authenticated manager\'s profile' })
    updateProfile(
        @CurrentUser() user: authenticatedUserType.AuthenticatedUser,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(
            user.id,
            dto,
        );
    }

    @Post('me/change-password')
    @ApiOperation({ summary: 'Change the authenticated manager\'s password' })
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