import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import InputField from './InputField';
import {
  fetchCommunesByPostalCode,
  isValidPostalCodeFormat,
  searchStreetAddresses,
} from '../services/franceAddressService';

function CitySelect({ label, value, cities, loading, disabled, postalReady, onChange, isAuth }) {
  const canPick = postalReady && !loading && cities.length > 0 && !disabled;

  const field = (
    <>
      <label className={isAuth ? undefined : 'pfield-label'}>
        {label} <span className="field-required">*</span>
      </label>
      <div className={isAuth ? 'input-wrapper select-wrapper-native select-no-chevron' : `pfield-input select-no-chevron ${!canPick ? 'pfield-disabled' : ''}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canPick}
          autoComplete="address-level2"
        >
          {!postalReady && <option value="">—</option>}
          {postalReady && loading && <option value="">…</option>}
          {postalReady && !loading && cities.length === 0 && <option value="">—</option>}
          {cities.map((c) => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>
    </>
  );

  if (isAuth) {
    return <div className="input-field">{field}</div>;
  }
  return <div className="pfield">{field}</div>;
}

export default function FrenchAddressFields({
  postalCode,
  city,
  address,
  onPostalCodeChange,
  onCityChange,
  onAddressChange,
  disabled = false,
  variant = 'auth',
}) {
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef(null);
  const isAuth = variant === 'auth';
  const postalReady = isValidPostalCodeFormat(postalCode);
  const postalLen = (postalCode || '').replace(/\D/g, '').length;

  useEffect(() => {
    if (!postalReady) {
      setCities([]);
      setCityError('');
      if (city) onCityChange('');
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoadingCities(true);
      setCityError('');
      try {
        const communes = await fetchCommunesByPostalCode(postalCode);
        setCities(communes);
        if (communes.length === 0) {
          setCityError('Aucune ville pour ce code postal.');
          onCityChange('');
        } else if (communes.length === 1) {
          onCityChange(communes[0].name);
        } else if (!communes.some((c) => c.name === city)) {
          onCityChange('');
        }
      } catch {
        setCityError('Impossible de charger les villes.');
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [postalCode]);

  useEffect(() => {
    if (disabled || !address || address.length < 3 || !city || !postalReady) {
      setSuggestions([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchStreetAddresses({ query: address, postalCode, city, limit: 6 });
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [address, city, postalCode, disabled]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pickSuggestion = (item) => {
    onAddressChange(item.street || item.label);
    if (item.postcode) onPostalCodeChange(item.postcode);
    if (item.city) onCityChange(item.city);
    setShowSuggestions(false);
  };

  const addressBlock = (
    <div className="address-autocomplete address-field-block" ref={wrapRef}>
      <InputField
        label="Adresse (n° et rue) *"
        value={address}
        onChangeText={(v) => { onAddressChange(v); setShowSuggestions(true); }}
        icon={<MapPin size={16} />}
        placeholder="15 rue de Paris"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="address-suggestions">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button type="button" onClick={() => pickSuggestion(s)}>{s.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const postalCityRow = isAuth ? (
    <div className="row-2 french-address-row">
      <InputField
        label="Code postal"
        value={postalCode}
        onChangeText={(v) => onPostalCodeChange(v.replace(/\D/g, '').slice(0, 5))}
        icon={<MapPin size={16} />}
        placeholder="75001"
        maxLength={5}
        inputMode="numeric"
      />
      <CitySelect
        label="Ville"
        value={city}
        cities={cities}
        loading={loadingCities}
        disabled={disabled}
        postalReady={postalReady}
        onChange={onCityChange}
        isAuth
      />
    </div>
  ) : (
    <div className="pfields-row french-address-row">
      <div className="pfield">
        <label className="pfield-label">Code postal *</label>
        <div className={`pfield-input ${disabled ? 'pfield-disabled' : ''}`}>
          <span className="pfield-icon"><MapPin size={15} /></span>
          <input
            type="text"
            value={postalCode ?? ''}
            onChange={(e) => onPostalCodeChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
            disabled={disabled}
            maxLength={5}
            placeholder="75001"
            inputMode="numeric"
            autoComplete="postal-code"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
      <CitySelect
        label="Ville"
        value={city}
        cities={cities}
        loading={loadingCities}
        disabled={disabled}
        postalReady={postalReady}
        onChange={onCityChange}
        isAuth={false}
      />
    </div>
  );

  const postalCityHints = (
    <>
      {postalLen > 0 && postalLen < 5 && (
        <p className={isAuth ? 'password-hint' : 'pfield-hint'}>
          Code postal incomplet : {postalLen}/5 chiffres (ex. 75001).
        </p>
      )}
      {loadingCities && postalReady && (
        <p className={isAuth ? 'password-hint' : 'pfield-hint'}>Chargement des villes…</p>
      )}
      {cityError && (
        <p className={`${isAuth ? 'password-hint' : 'pfield-hint'} field-error`}>{cityError}</p>
      )}
    </>
  );

  if (isAuth) {
    return (
      <div className="french-address-fields">
        {postalCityRow}
        {postalCityHints}
        {addressBlock}
      </div>
    );
  }

  return (
    <div className="french-address-fields">
      {postalCityRow}
      {postalCityHints}
      <div className="pfield address-field-block" ref={wrapRef}>
        <label className="pfield-label">Adresse (n° et rue) *</label>
        <div className={`pfield-input ${disabled ? 'pfield-disabled' : ''}`}>
          <span className="pfield-icon"><MapPin size={15} /></span>
          <input
            type="text"
            value={address ?? ''}
            onChange={(e) => { onAddressChange(e.target.value); setShowSuggestions(true); }}
            disabled={disabled}
            placeholder="Ex. 15 rue de Paris"
            autoComplete="street-address"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        {showSuggestions && !disabled && suggestions.length > 0 && (
          <ul className="address-suggestions">
            {suggestions.map((s) => (
              <li key={s.label}>
                <button type="button" onClick={() => pickSuggestion(s)}>{s.label}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
