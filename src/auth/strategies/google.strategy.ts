import {Injectable, UnauthorizedException} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
    ) {
        super({
            clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        const { name, emails, photos } = profile;
        const user = {
            email: emails[0].value,
            firstName: name.givenName,
            lastName: name.familyName,
            picture: photos[0].value,
            accessToken,
        };

        if (!user.email) {
            throw new UnauthorizedException(
                'Google did not provide an email address',
            );
        }

        const emailVerified =
            (profile as Profile & {
                _json?: { email_verified?: boolean };
            })._json?.email_verified === true;

        if (!emailVerified) {
            throw new UnauthorizedException(
                'A verified Google email address is required',
            );
        }

        const lastName = user.lastName.trim();
        const firstName = user.firstName.trim();
        const email = user.email;

        return {
            googleId: profile.id,
            email,
            firstName,
            lastName,
            picture: profile.photos?.[0]?.value,
        };
    }
}