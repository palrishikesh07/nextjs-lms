import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDTO } from './dto/registerUser.dto.js';

@Controller('auth')
export class AuthController {
    // authService: AuthService;
    // constructor(authService: AuthService){
    //     this.authService = authService;
    // }

    // Or user 
    constructor(private readonly authService: AuthService){}

    @Post("register")
    register(@Body() registerUserDTO:RegisterDTO){
        // console.log("registerUserDTO: ",registerUserDTO)
        const result = this.authService.registerUser(registerUserDTO);
        return result;
    }
}

