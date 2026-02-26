import React, { memo, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../constants/theme';
import { scale, responsiveFontSize } from '../utils/responsive';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  headerStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  showShadow?: boolean;
  testID?: string;
}

/**
 * Optimized Card component with memo
 * Prevents re-renders when props haven't changed
 */
export const Card = memo(function Card({
  title,
  subtitle,
  children,
  onPress,
  style,
  headerStyle,
  titleStyle,
  subtitleStyle,
  showShadow = true,
  testID,
}: CardProps) {
  const { colors, shadows } = useTheme();
  
  const containerStyle = useMemo(() => [
    styles.card,
    { 
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    showShadow && shadows.md,
    style,
  ], [colors.surface, colors.border, showShadow, style, shadows]);

  const headerContainerStyle = useMemo(() => [
    styles.header,
    headerStyle,
  ], [headerStyle]);

  const titleTextStyle = useMemo(() => [
    styles.title,
    { color: colors.text },
    titleStyle,
  ], [colors.text, titleStyle]);

  const subtitleTextStyle = useMemo(() => [
    styles.subtitle,
    { color: colors.textSecondary },
    subtitleStyle,
  ], [colors.textSecondary, subtitleStyle]);

  const content = (
    <View style={containerStyle} testID={testID}>
      {(title || subtitle) && (
        <View style={headerContainerStyle}>
          {title && <Text style={titleTextStyle}>{title}</Text>}
          {subtitle && <Text style={subtitleTextStyle}>{subtitle}</Text>}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Optimized ListItem component with memo
 */
export const ListItem = memo(function ListItem({
  title,
  subtitle,
  icon,
  rightElement,
  onPress,
  style,
  testID,
}: ListItemProps) {
  const { colors } = useTheme();

  const containerStyle = useMemo(() => [
    styles.listItem,
    { 
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    style,
  ], [colors.surface, colors.border, style]);

  const titleStyle = useMemo(() => [
    styles.listItemTitle,
    { color: colors.text },
  ], [colors.text]);

  const subtitleStyle = useMemo(() => [
    styles.listItemSubtitle,
    { color: colors.textSecondary },
  ], [colors.textSecondary]);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={handlePress}
      disabled={!onPress}
      testID={testID}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={titleStyle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={subtitleStyle} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {rightElement}
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
});

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

/**
 * Optimized Badge component with memo
 */
export const Badge = memo(function Badge({
  text,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const { colors } = useTheme();

  const variantColors = useMemo(() => ({
    default: { bg: colors.primary + '20', text: colors.primary },
    success: { bg: colors.success + '20', text: colors.success },
    warning: { bg: colors.warning + '20', text: colors.warning },
    error: { bg: colors.error + '20', text: colors.error },
    info: { bg: colors.info + '20', text: colors.info },
  }), [colors]);

  const sizeStyles = useMemo(() => ({
    sm: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    md: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 11 },
    lg: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 12 },
  }), []);

  const badgeStyle = useMemo(() => [
    styles.badge,
    { 
      backgroundColor: variantColors[variant].bg,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
      paddingVertical: sizeStyles[size].paddingVertical,
    },
    style,
  ], [variant, size, variantColors, sizeStyles, style]);

  const textStyle = useMemo(() => [
    styles.badgeText,
    { 
      color: variantColors[variant].text,
      fontSize: sizeStyles[size].fontSize,
    },
  ], [variant, variantColors, sizeStyles, size]);

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{text.toUpperCase()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: scale(16),
    paddingTop: scale(16),
    paddingBottom: scale(8),
  },
  title: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
  },
  subtitle: {
    fontSize: responsiveFontSize(12),
    marginTop: 4,
  },
  content: {
    padding: scale(16),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  listItemTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '500',
  },
  listItemSubtitle: {
    fontSize: responsiveFontSize(13),
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});