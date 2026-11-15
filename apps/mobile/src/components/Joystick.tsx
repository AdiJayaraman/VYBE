import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { theme } from '../lib/theme';

export interface JoystickVector {
  x: number;
  y: number;
}

interface JoystickProps {
  size?: number;
  onChange: (vector: JoystickVector) => void;
}

/** Virtual thumbstick: normalised vector in [-1, 1] on both axes. */
export function Joystick({ size = 132, onChange }: JoystickProps) {
  const radius = size / 2;
  const [knob, setKnob] = useState<JoystickVector>({ x: 0, y: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_event, gesture) => {
          const distance = Math.hypot(gesture.dx, gesture.dy);
          const scale = distance > radius ? radius / distance : 1;
          const x = gesture.dx * scale;
          const y = gesture.dy * scale;
          setKnob({ x, y });
          onChangeRef.current({ x: x / radius, y: y / radius });
        },
        onPanResponderRelease: () => {
          setKnob({ x: 0, y: 0 });
          onChangeRef.current({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          setKnob({ x: 0, y: 0 });
          onChangeRef.current({ x: 0, y: 0 });
        },
      }),
    [radius],
  );

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius }]} {...panResponder.panHandlers}>
      <View
        style={[
          styles.knob,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size * 0.21,
            transform: [{ translateX: knob.x }, { translateY: knob.y }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    backgroundColor: 'rgba(15, 22, 41, 0.7)',
  },
  knob: {
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
});
