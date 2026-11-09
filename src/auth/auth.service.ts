import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service.js';
import { RegisterDTO } from './dto/registerUser.dto.js';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDTO } from './dto/LoginUser.dto.js';

@Injectable()
export class AuthService {

    constructor(private readonly userService: UserService,
        private readonly jwtService: JwtService
    ) { }

    async registerUser(registerUserDTO: RegisterDTO) {
        const saltRound = 10;
        const hash = await bcrypt.hash(registerUserDTO.password, saltRound);
        const user = await this.userService.createUser({ ...registerUserDTO, password: hash });
        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = await this.jwtService.signAsync(payload);

        return { access_token: token };
    }

    async loginUser(loginUserDTO: LoginDTO) {
        const user = await this.userService.findByEmail(loginUserDTO.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(loginUserDTO.password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user._id, email: user.email, role: user.role };
        const token = await this.jwtService.signAsync(payload);

        return { access_token: token };
    }
}
