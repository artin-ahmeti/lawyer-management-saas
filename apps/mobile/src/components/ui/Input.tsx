import { Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { cn } from './cn';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-caption font-semibold text-ink-muted">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#8B94A3"
        className={cn(
          'rounded-md border bg-sunken px-4 py-3 text-body text-ink',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
      {error ? <Text className="text-caption text-danger">{error}</Text> : null}
    </View>
  );
}
