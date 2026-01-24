import { Text as RNText } from 'react-native';
import { Text, TextProps } from './Themed';

// NativeWind 版本的 MonoText
export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}

// 使用 NativeWind 的版本
export function NativeWindMonoText({
  className = '',
  ...props
}: TextProps & { className?: string }) {
  return <RNText className={`font-mono ${className}`} {...props} />;
}
