import { ReactNode } from 'react';
import { TextInputProps, ViewStyle, TextStyle } from 'react-native';

export interface NavigationProps {
  navigate: (screen: string) => void;
  reset: (options: { index: number; routes: Array<{ name: string }> }) => void;
}

export interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}
