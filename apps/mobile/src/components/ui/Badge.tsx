import { Text, View } from 'react-native';
import { cn } from './cn';

type Tone = 'accent' | 'neutral' | 'success' | 'danger' | 'rust';

const tones: Record<Tone, { box: string; text: string }> = {
  accent: { box: 'bg-primary/15', text: 'text-primary' },
  neutral: { box: 'bg-line/40', text: 'text-ink-muted' },
  success: { box: 'bg-success/15', text: 'text-success' },
  danger: { box: 'bg-danger/15', text: 'text-danger' },
  rust: { box: 'bg-rust/25', text: 'text-danger' },
};

export function Badge({ tone = 'neutral', label }: { tone?: Tone; label: string }) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', tones[tone].box)}>
      <Text className={cn('text-caption font-semibold uppercase tracking-wide', tones[tone].text)}>
        {label}
      </Text>
    </View>
  );
}
