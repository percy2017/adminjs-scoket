import { User } from './User.js';
import { Role } from './Role.js';
import { Permission } from './Permission.js';

User.associate({ Role, Permission });
Role.associate({ User, Permission });
Permission.associate({ Role, User });

export { User, Role, Permission };
