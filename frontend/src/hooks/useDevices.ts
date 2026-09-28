import { useMemo } from 'react';
import { useCache, useData, without } from '@/hooks/useData';
import { DEVICES_PATH, forgetAllDevices, forgetDevice } from '@/services/account';
import type { TrustedDevice } from '@/types/auth';
import { removeDeviceToken } from '@/utils/cookies';

export const useDevices = () => useData<TrustedDevice[]>(DEVICES_PATH);

export function useDeviceActions() {
  const { mutate } = useCache();

  return useMemo(
    () => ({
      async forget(id: string) {
        await forgetDevice(id);
        void mutate(DEVICES_PATH, without<TrustedDevice>(id), { revalidate: false });
      },
      /** This browser's own token is among them, so it goes too. */
      async forgetAll() {
        await forgetAllDevices();
        removeDeviceToken();
        void mutate(DEVICES_PATH, [], { revalidate: false });
      },
    }),
    [mutate],
  );
}
