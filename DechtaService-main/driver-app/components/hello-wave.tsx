// components/hello-wave.tsx
// FIX: replaced web-only CSS animationName with react-native-reanimated
// Works correctly on iOS, Android, and Web.
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export function HelloWave() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(25, { duration: 150, easing: Easing.out(Easing.ease) }),
        withTiming(0,  { duration: 150, easing: Easing.in(Easing.ease)  }),
      ),
      4,   // repeat 4 times
      false // don't reverse
    );
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.Text style={[{ fontSize: 28, lineHeight: 32, marginTop: -6 }, animatedStyle]}>
      👋
    </Animated.Text>
  );
}
