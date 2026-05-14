export default function InputField({
  label,
  value,
  onChangeText,
  icon,
  placeholder,
  type = 'text',
  rightElement,
  autoComplete,
}) {
  const inferredAutoComplete =
    autoComplete ??
    (type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off');

  return (
    <div className="input-field">
      <label>{label}</label>
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          autoComplete={inferredAutoComplete}
        />
        {rightElement && <span className="input-right">{rightElement}</span>}
      </div>
    </div>
  );
}
