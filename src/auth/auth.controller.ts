import {Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards} from "@nestjs/common";
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
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin(): void {
    // Passport handles the redirect to Google.
  }

  /**
   * Handle Google's OAuth redirect/callback.
   */
  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
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
    return res.redirect(
      `${frontendUrl}/login?token=${result}`,
    );
  }
}