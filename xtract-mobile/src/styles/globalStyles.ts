import { StyleSheet, Dimensions } from 'react-native';
import { colors } from './colors';

const { width, height } = Dimensions.get('window');

export const globalStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 20,
    padding: 25,
    marginVertical: 10,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  cardSmall: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Text styles
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    fontFamily: 'System',
  },
  
  subtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'System',
  },
  
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  
  heading2: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  
  bodyText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 24,
  },
  
  bodyTextSecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 16,
  },
  
  // Button styles
  button: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  buttonSmall: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Input styles
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Layout styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  // Spacing
  marginSmall: {
    margin: 8,
  },
  
  marginMedium: {
    margin: 16,
  },
  
  marginLarge: {
    margin: 24,
  },
  
  paddingSmall: {
    padding: 8,
  },
  
  paddingMedium: {
    padding: 16,
  },
  
  paddingLarge: {
    padding: 24,
  },
  
  // Waveform styles (matching desktop)
  waveform: {
    height: 80,
    borderRadius: 12,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  waveformBar: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    marginHorizontal: 1,
  },
  
  waveformBarActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export const dimensions = {
  width,
  height,
  isSmallScreen: width < 375,
  isLargeScreen: width > 414,
}; 