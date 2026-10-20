import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = 64;
export const TAB_BAR_SIDE_MARGIN = 32;

// Gap between the bottom of the screen and the floating bar
export function useTabBarOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 16);
}

// How much bottom padding a screen needs so nothing hides behind the bar
export function useTabBarClearance() {
  return useTabBarOffset() + TAB_BAR_HEIGHT + 24;
}

// True while the keyboard is open
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return open;
}