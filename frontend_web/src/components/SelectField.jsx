import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectField({
  label,
  value,
  onChange,
  options,
  icon,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value && opt.value !== '');
  const placeholderOption = options.find((opt) => opt.value === '');
  const displayLabel = selectedOption
    ? selectedOption.label
    : (placeholderOption?.label || 'Sélectionner…');

  return (
    <div className="input-field select-field-custom" ref={dropdownRef}>
      <label>
        {label}
        {required && <span className="field-required"> *</span>}
      </label>
      <div 
        className={`input-wrapper custom-select-wrapper ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && <span className="input-icon">{icon}</span>}
        <div className={`custom-select-value ${!selectedOption ? 'is-placeholder' : ''}`}>
          {displayLabel}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`custom-select-chevron ${isOpen ? 'open' : ''}`}
          aria-hidden
        />
      </div>
      
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((opt) => (
            <div
              key={opt.value || opt.label}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
