import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type BodyGender = 'male' | 'female';

let current: BodyGender = 'male';
let loaded = false;
const listeners = new Set<(g: BodyGender) => void>();

async function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  const v = await AsyncStorage.getItem('bodyGender');
  if (v === 'male' || v === 'female') {
    current = v;
    listeners.forEach((l) => l(current));
  }
}

export async function setBodyGender(g: BodyGender) {
  current = g;
  loaded = true;
  listeners.forEach((l) => l(g));
  await AsyncStorage.setItem('bodyGender', g);
}

export function useBodyGender(): BodyGender {
  const [g, setG] = useState<BodyGender>(current);
  useEffect(() => {
    listeners.add(setG);
    ensureLoaded();
    setG(current);
    return () => {
      listeners.delete(setG);
    };
  }, []);
  return g;
}