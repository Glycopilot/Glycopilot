import { useId } from 'react';

export default function InputField({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  type = 'text',
  rightElement,
  autoComplete,
  maxLength,
  inputMode,
  spellCheck = false,
  name,
}) {
  const fieldId = useId();
  const inferredAutoComplete =
    autoComplete !== undefined
      ? autoComplete
      : (type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off');
  const inputType = type === 'email' ? 'text' : type;

  return (
    <div className="input-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="input-wrapper">
        {icon && <span className="input-icon" aria-hidden>{icon}</span>}
        <input
          id={fieldId}
          name={name ?? fieldId}
          type={inputType}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          autoComplete={inferredAutoComplete}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={spellCheck}
          maxLength={maxLength}
          inputMode={inputMode ?? (type === 'email' ? 'email' : undefined)}
        />
        {rightElement && <span className="input-right">{rightElement}</span>}
      </div>
    </div>
  );
}
