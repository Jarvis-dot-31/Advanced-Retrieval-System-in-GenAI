import type { Metadata } from 'next';
import SelectRolePage from '@/views/SelectRolePage';

export const metadata: Metadata = {
  title: 'Choose Your Role',
  description: 'Select your role to get started with INSIGHT',
};

export default function SelectRoleRoute() {
  return <SelectRolePage />;
}
