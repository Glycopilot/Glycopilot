import React from 'react';
import { StyleSheet, View, TextInput, Text } from 'react-native';
import { colors } from '../../themes/colors';

/**
 * Composant d'input réutilisable
 * @param {string} label - Label de l'input
 * @param {string} value - Valeur de l'input
 * @param {function} onChangeText - Callback de changement de texte
 * @param {React.ReactNode} icon - Icône à gauche (optional)
 * @param {React.ReactNode} rightElement - Élément à droite (optional)
 * @param {boolean} secureTextEntry - Pour les champs password
 * @param {string} placeholder - Placeholder du champ
 * @param {string} keyboardType - Type de clavier
 * @param {boolean} autoCorrect - Autocomplétion
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
}) {
  return (
    <View style={styles.inputWrapper}>
      {label && <CustomTextLabel text={label} />}
      <View style={styles.inputContainer}>
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          keyboardType={keyboardType}
          autoCorrect={autoCorrect}
          placeholderTextColor="#ccc"
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
function CustomTextLabel({ text }) {
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
