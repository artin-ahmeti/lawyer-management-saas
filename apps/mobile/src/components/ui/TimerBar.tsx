import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { cn } from './cn';
import { Icon } from './Icon';
import { Text } from './Text';

export interface TimerBarProps {
  title: string;
  subtitle?: string;
  /** "00:42:17" */
  time: string;
  paused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onPress?: () => void;
  className?: string;
}

/** The docked running-timer bar: pulsing dot, matter, mono time, pause and stop. */
export function TimerBar({
  title,
  subtitle,
  time,
  paused,
  onPause,
  onResume,
  onStop,
  onPress,
  className,
}: TimerBarProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (paused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [paused, pulse]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-lg border border-hairline bg-surface-3 py-2.5 pl-4 pr-2.5 shadow-md',
        className,
      )}
    >
      <Animated.View
        className={cn('h-2 w-2 rounded-full', paused ? 'bg-warning-dot' : 'bg-accent')}
        style={{
          opacity: paused ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
        }}
      />
      <View className="flex-1">
        <Text variant="label" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="mono-id" className="text-[17px]" tabular>
        {time}
      </Text>
      {paused ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume"
          onPress={onResume}
          className="h-9 w-9 items-center justify-center rounded-sm bg-accent"
        >
          <Icon name="play" size="sm" tone="on-accent" filled />
        </Pressable>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pause"
            onPress={onPause}
            className="h-9 w-9 items-center justify-center rounded-sm bg-surface-2"
          >
            <Icon name="pause" size="sm" filled />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop"
            onPress={onStop}
            className="h-9 w-9 items-center justify-center rounded-sm bg-accent"
          >
            <Icon name="stop" size="sm" tone="on-accent" filled />
          </Pressable>
        </>
      )}
    </Pressable>
  );
}

/** Large mono timer for the Start-timer flow; leading zero groups are dimmed. */
export function TimerHero({ time, caption }: { time: string; caption?: string }) {
  const m = /^((?:00:)+)(.*)$/.exec(time);
  return (
    <View className="items-center gap-1.5 pb-2 pt-5">
      <Text variant="mono-timer" tabular>
        {m ? (
          <>
            <Text variant="mono-timer" tone="faint" tabular>
              {m[1]}
            </Text>
            {m[2]}
          </>
        ) : (
          time
        )}
      </Text>
      {caption ? (
        <Text variant="label" tone="muted">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}
