import { useCallback, useEffect, useState } from 'react';
import { getAppSetting, setAppSetting } from '../db/database';

export interface AppSettingsViewModel {
  userName: string;
  setUserName: (v: string) => void;
  save: () => void;
  isSaved: boolean;
}

export function useAppSettingsViewModel(): AppSettingsViewModel {
  const [userName, setUserName] = useState('Kunal');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setUserName(getAppSetting('user_name') ?? 'Kunal');
  }, []);

  const save = useCallback(() => {
    const trimmed = userName.trim();
    if (!trimmed) return;
    setAppSetting('user_name', trimmed);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [userName]);

  return { userName, setUserName, save, isSaved };
}
