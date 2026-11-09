import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDTO } from '../auth/dto/registerUser.dto.js';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema.js';
import { LoginDTO } from '../auth/dto/LoginUser.dto.js';

@Injectable()
export class UserService {

    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    async createUser(registerUserDTO: RegisterDTO) {

        try {

            const user = await this.userModel.create({
                fname: registerUserDTO.fname,
                lname: registerUserDTO.lname,
                email: registerUserDTO.email,
                password: registerUserDTO.password,
            })

            return user;

        } catch (error: unknown) {
            console.log(error);

            const e = error as { code?: number };

            const DUPLICATE_KEY_CODE = 11000;

            if (e.code == DUPLICATE_KEY_CODE) {
                throw new ConflictException('Email is already taken');
            }

            throw error;
        }

    }

    async findByEmail(email: string) {
        return this.userModel.findOne({ email }).exec();
    }

    // async loginUser(loginUserDTO: LoginDTO) {
    //     const user = await this.findByEmail(loginUserDTO.email);

    //     if (!user) {
    //         throw new UnauthorizedException('Invalid credentials');
    //     }

    //     return user;
    // }

    async getUserById(id: string) {
        return this.userModel.findById(id).exec();
    }
}
