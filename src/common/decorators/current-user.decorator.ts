import {
    createParamDecorator,
    ExecutionContext,
} from '@nestjs/common';

import { AuthenticatedUser } from '../types/authenticated-user.type';

export const CurrentUser = createParamDecorator<
    keyof AuthenticatedUser | undefined,
    AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser]
>(
    (data, context: ExecutionContext) => {
        const request = context
            .switchToHttp()
            .getRequest();

        const user = request.user as AuthenticatedUser;

        return data ? user[data] : user;
    },
);