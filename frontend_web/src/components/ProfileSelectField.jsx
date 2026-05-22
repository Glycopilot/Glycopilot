export default function ProfileSelectField({
  label,
  value,
  options,
  editable,
  onChange,
  locked = false,
  hint,
}) {
  return (
    <div className="pfield">
      <label className="pfield-label">
        {label}
        {locked && <span className="locked-tag">Non modifiable</span>}
      </label>
      <div className={`pfield-input ${!editable || locked ? 'pfield-disabled' : ''}`}>
        <select
          value={value ?? ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={!editable || locked}
        >
          {options.map((opt) => (
            <option key={opt.value || opt.label} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {hint && <p className="pfield-hint">{hint}</p>}
    </div>
  );
}
