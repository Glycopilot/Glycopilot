import React, { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../../themes/colors';

interface InputFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  icon?: ReactNode;
  rightElement?: ReactNode;
  secureTextEntry?: boolean;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCorrect?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

/**
 * Composant d'input réutilisable
 */
export default function InputField({
  label,
  value,
  onChangeText,
  icon,
  rightElement,
  secureTextEntry = false,
  placeholder = '',
  keyboardType = 'default',
  autoCorrect = true,
  containerStyle,
  inputStyle,
  ...rest
}: InputFieldProps) {
  return (
    <View style={[styles.inputWrapper, containerStyle]}>
      {label && <CustomTextLabel text={label} />}
      <View style={styles.inputContainer}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCorrect={autoCorrect}
          placeholderTextColor="#ccc"
          {...rest}
        />
        {rightElement && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>
    </View>
  );
}

/**
 * Composant pour le label
 */
function CustomTextLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundColor,
    paddingHorizontal: 12,
    height: 50,
  },
  iconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingLeft: 8,
    outlineColor: 'transparent',
  },
  rightElement: {
    marginLeft: 8,
  },
});
