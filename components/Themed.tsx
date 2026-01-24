/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView, useColorScheme } from 'react-native';

import Colors from '@/constants/Colors';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

// 为支持 NativeWind 添加的类型
interface NativeWindProps {
  className?: string;
}

export type TextProps = ThemeProps & DefaultText['props'] & NativeWindProps;
export type ViewProps = ThemeProps & DefaultView['props'] & NativeWindProps;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, className, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  if (className) {
    // 当使用 className 时，将主题颜色和样式合并到 className 中
    // 这里我们需要一种方法来将颜色作为内联样式传递给 NativeWind 组件
    return <DefaultText style={[{ color }, style]} className={className} {...otherProps} />;
  }

  // 否则使用传统样式
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, className, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  if (className) {
    // 当使用 className 时，将背景颜色和样式合并
    return (
      <DefaultView style={[{ backgroundColor }, style]} className={className} {...otherProps} />
    );
  }

  // 否则使用传统样式
  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
