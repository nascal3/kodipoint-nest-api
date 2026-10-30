import {Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards} from "@nestjs/common";
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleOAuthGuard } from '@/auth/guards/google-oauth.guard';
import {AuthService} from "@/auth/auth.service";
import {RegisterDto} from "@/auth/dto/register.dto";
import {LoginDto} from "@/auth/dto/login.dto";
import {ConfigService} from "@nestjs/config";
import type { Request, Response } from 'express';

interface GoogleAuthenticatedUser {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and return access token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login flow' })
  googleLogin(): void {
    // Passport handles the redirect to Google.
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Handle Google OAuth callback and redirect to frontend' })
  async googleCallback(
    @Req()
    req: Request & { user: GoogleAuthenticatedUser },
    @Res()
    res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException(
        'Google authentication failed',
      );
    }

    // Generate your application's JWT for the authenticated user.
    const result = await this.authService.loginWithGoogle(
      req.user,
    );

    const frontendUrl = this.configService.getOrThrow<string>(
      'FRONTEND_URL',
    );

    // Redirect to your frontend after successful authentication.
    // http://localhost:4200/auth/callback?accessToken=YOUR_TOKEN&user={"firstName":"John","lastName":"Doe","email":"john@example.com"}
    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&user=${encodeURIComponent(JSON.stringify(result.user))}`,
    );
  }
}