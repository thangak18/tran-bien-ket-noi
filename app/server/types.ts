import type { StaffProfile } from './middleware/auth';

export type AppVariables = {
  staff?: StaffProfile;
  citizenPhone?: string;
  requestId: string;
};

export type AppEnv = {
  Variables: AppVariables;
};
