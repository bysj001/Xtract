import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../styles/colors';

interface WaveformProps {
  isPlaying?: boolean;
  height?: number;
  barCount?: number;
  style?: any;
}

export const Waveform: React.FC<WaveformProps> = ({
  isPlaying = false,
  height = 80,
  barCount = 30,
  style,
}) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isPlaying) {
      // Create staggered animations for each bar
      const animations = animatedValues.map((animatedValue, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 0.8 + Math.random() * 0.4,
              duration: 300 + Math.random() * 400,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.2 + Math.random() * 0.3,
              duration: 300 + Math.random() * 400,
              useNativeDriver: false,
            }),
          ])
        );
      });

      // Start animations with delays
      animations.forEach((animation, index) => {
        setTimeout(() => animation.start(), index * 50);
      });

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      // Reset to static state
      animatedValues.forEach(animatedValue => {
        Animated.timing(animatedValue, {
          toValue: 0.3 + Math.random() * 0.4,
          duration: 200,
          useNativeDriver: false,
        }).start();
      });
    }
  }, [isPlaying]);

  const gradientColors = isPlaying
    ? ['#ff6b6b', '#4ecdc4', '#7b68ee', '#feca57', '#48dbfb']
    : ['rgba(255, 107, 107, 0.8)', 'rgba(78, 205, 196, 0.8)', 'rgba(123, 104, 238, 0.8)'];

  return (
    <View style={[styles.container, { height }, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.barsContainer}>
          {animatedValues.map((animatedValue, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  height: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['20%', '80%'],
                  }),
                  opacity: isPlaying ? 0.8 : 0.3,
                },
              ]}
            />
          ))}
        </View>
        
        {/* Overlay gradient for extra visual effect */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overlay}
        />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '60%',
    width: '80%',
    position: 'absolute',
  },
  bar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    marginHorizontal: 1,
    minHeight: '20%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}); 