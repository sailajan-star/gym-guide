import { Pressable, Text } from 'react-native';

import { useTheme } from '@/constants/app-theme';

export default function ThemeToggle() {
  const { mode, palette, toggle } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.surface,
        //borderWidth: 1,
        //borderColor: palette.border,
        shadowColor: '#6B6570',
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
      }}
    >
      <Text style={{ fontSize: 14 , color: '#FFFFFF'}}>{mode === 'dark' ? '☾' : '☀'}</Text>
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700', marginLeft: 0 }}>
      </Text>
    </Pressable>
  );
}