import {Body, Controller, Post} from "@nestjs/common";
import {AuthService} from "@/auth/auth.service";
import {RegisterDto} from "@/auth/dto/register.dto";
import {LoginDto} from "@/auth/dto/login.dto";

@Controller({
    path: 'auth',
    version: '1',
})
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }
}