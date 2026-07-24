import { ensurePermissionsColumn } from '../services/usersService.js';

ensurePermissionsColumn()
  .then(() => {
    console.log('User permissions column ensured & backfilled.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
