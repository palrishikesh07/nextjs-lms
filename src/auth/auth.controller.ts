import { Body, Controller, Get, Post, Req, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDTO } from './dto/registerUser.dto.js';
import { LoginDTO } from './dto/LoginUser.dto.js';
import { AuthGuard } from './auth.guard.js';
import { UserService } from '../user/user.service.js';
import { RolesGuard } from './roles.guard.js';

@Controller('auth')
export class AuthController {
    // authService: AuthService;
    // constructor(authService: AuthService){
    //     this.authService = authService;
    // }

    // Or user 
    constructor(private readonly authService: AuthService, private readonly userService: UserService
    ) { }

    @Post("register")
    async register(@Body() registerUserDTO: RegisterDTO) {
        // console.log("registerUserDTO: ",registerUserDTO)
        const result = await this.authService.registerUser(registerUserDTO);
        return result;
    }

    @Post("login")
    async login(@Body() loginUserDTO: LoginDTO) {
        const result = await this.authService.loginUser(loginUserDTO);
        return result;
    }


    @UseGuards(AuthGuard)
    @Get("profile")
    async getProfile(@Request() req: any) {
        const userId = req.user.sub;
        const user = await this.userService.getUserById(userId);

        if (user) {
            const { password, ...safeUser } = user.toObject ? user.toObject() : user;
            return safeUser;
        }

        return null;
    }
}

