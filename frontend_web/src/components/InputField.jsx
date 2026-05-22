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
}) {
  const inferredAutoComplete =
    autoComplete ??
    (type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off');
  const inputType = type === 'email' ? 'text' : type;

  return (
    <div className="input-field">
      <label>{label}</label>
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
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
