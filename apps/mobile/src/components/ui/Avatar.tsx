import { Text, View } from 'react-native';
import { cn } from './cn';

const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' } as const;
const textSizes = { sm: 'text-caption', md: 'text-body', lg: 'text-title' } as const;

export function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof sizes }) {
  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View className={cn('items-center justify-center rounded-full bg-primary/20', sizes[size])}>
      <Text className={cn('font-bold text-primary', textSizes[size])}>{initials}</Text>
    </View>
  );
}
