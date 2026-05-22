import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import InputField from './InputField';
import { ADDRESS_MSG } from '../constants/addressMessages';
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
          autoComplete="off"
        >
          {!postalReady && <option value="">{ADDRESS_MSG.selectPostalFirst}</option>}
          {postalReady && loading && <option value="">{ADDRESS_MSG.selectLoading}</option>}
          {postalReady && !loading && cities.length === 0 && (
            <option value="">{ADDRESS_MSG.selectNoCity}</option>
          )}
          {postalReady && !loading && cities.length > 1 && !value && (
            <option value="">{ADDRESS_MSG.selectPickCity}</option>
          )}
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

function HintLine({ children, variant = 'info', isAuth }) {
  const cls = isAuth ? 'password-hint' : 'pfield-hint';
  if (variant === 'error') {
    return <p className={`${cls} field-error`}>{children}</p>;
  }
  if (variant === 'success') {
    return <p className={`${cls} address-hint-success`}>{children}</p>;
  }
  return <p className={cls}>{children}</p>;
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
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressSearched, setAddressSearched] = useState(false);
  const wrapRef = useRef(null);
  const isAuth = variant === 'auth';
  const postalReady = isValidPostalCodeFormat(postalCode);
  const postalLen = (postalCode || '').replace(/\D/g, '').length;
  const canSearchAddress = postalReady && !!city && !disabled && (address || '').length >= 3;

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
          setCityError(ADDRESS_MSG.postalNoCity);
          onCityChange('');
        } else if (communes.length === 1) {
          onCityChange(communes[0].name);
        } else if (!communes.some((c) => c.name === city)) {
          onCityChange('');
        }
      } catch (err) {
        setCityError(err?.message || ADDRESS_MSG.postalLoadError);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    }, 300);

    return () => clearTimeout(timer);
    // postalCode seul : évite une boucle si le parent recrée onCityChange à chaque rendu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalCode]);

  useEffect(() => {
    if (!canSearchAddress) {
      setSuggestions([]);
      setAddressSearched(false);
      setLoadingAddress(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoadingAddress(true);
      try {
        const results = await searchStreetAddresses({
          query: address,
          postalCode,
          city,
          limit: 8,
        });
        setSuggestions(results);
        setAddressSearched(true);
        if (results.length > 0) setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setAddressSearched(true);
      } finally {
        setLoadingAddress(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [address, city, postalCode, disabled, canSearchAddress]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pickSuggestion = (item) => {
    onAddressChange(item.label);
    if (item.postcode) onPostalCodeChange(item.postcode);
    if (item.city) onCityChange(item.city);
    setShowSuggestions(false);
    setAddressSearched(false);
  };

  const suggestionsList = showSuggestions && suggestions.length > 0 && (
    <ul className="address-suggestions" role="listbox" aria-label="Adresses proposées">
      {suggestions.map((s) => (
        <li key={s.label} role="option" aria-selected={false}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(s)}>
            {s.label}
          </button>
        </li>
      ))}
    </ul>
  );

  const addressBlock = (
    <div className="address-autocomplete address-field-block" ref={wrapRef}>
      <InputField
        label="Adresse (n° et rue) *"
        value={address}
        onChangeText={(v) => {
          onAddressChange(v);
          setShowSuggestions(true);
          setAddressSearched(false);
        }}
        icon={<MapPin size={16} strokeWidth={1.75} />}
        placeholder={ADDRESS_MSG.addressPlaceholder(city)}
        autoComplete="off"
        name="medical-center-address"
      />
      {!city && postalReady && !loadingCities && (
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.cityPick}</HintLine>
      )}
      {city && (address || '').length > 0 && (address || '').length < 3 && (
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.addressTypeHint}</HintLine>
      )}
      {loadingAddress && <HintLine isAuth={isAuth}>{ADDRESS_MSG.addressSearching}</HintLine>}
      {canSearchAddress && addressSearched && !loadingAddress && suggestions.length === 0 && (
        <HintLine isAuth={isAuth} variant="error">{ADDRESS_MSG.addressNoResult}</HintLine>
      )}
      {canSearchAddress && suggestions.length > 0 && !showSuggestions && (
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.addressPickHint}</HintLine>
      )}
      {suggestionsList}
    </div>
  );

  const postalCityRow = isAuth ? (
    <div className="row-2 french-address-row">
      <InputField
        label="Code postal *"
        value={postalCode}
        onChangeText={(v) => onPostalCodeChange(v.replace(/\D/g, '').slice(0, 5))}
        icon={<MapPin size={16} strokeWidth={1.75} />}
        placeholder="Ex. 94320"
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
            placeholder="Ex. 94320"
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
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.postalIncomplete(postalLen)}</HintLine>
      )}
      {loadingCities && postalReady && (
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.postalLoading}</HintLine>
      )}
      {cityError && <HintLine isAuth={isAuth} variant="error">{cityError}</HintLine>}

      {postalReady && !loadingCities && !cityError && cities.length > 1 && !city && (
        <HintLine isAuth={isAuth}>{ADDRESS_MSG.cityPick}</HintLine>
      )}
    </>
  );

  return (
    <div className="french-address-fields">
      {isAuth && <p className="address-intro">{ADDRESS_MSG.intro}</p>}
      {postalCityRow}
      {postalCityHints}
      {addressBlock}
    </div>
  );
}
