import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { RegisterDTO } from './dto/registerUser.dto.js';

@Injectable()
export class AuthService {
    constructor(private readonly userService:UserService){}
    registerUser(registerUserDTO: RegisterDTO){
        console.log(registerUserDTO);
        return this.userService.createUser();
        // return {message:"User register sucessfully from DB!"};
    }
}
