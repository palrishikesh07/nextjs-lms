import { Injectable } from "@nestjs/common";
import { Role } from "../user/user.types.js";
import { ROLES_KEY } from "./roles.decorator.js";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard {
    
    constructor(private reflector: Reflector) { }

    canActivate(context: any): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }

        return requiredRoles.some((role) => user.role === role);
    }
}       