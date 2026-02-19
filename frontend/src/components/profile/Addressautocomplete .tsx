import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface AddressSuggestion {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    label: string;
    score: number;
    housenumber?: string;
    id: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string;
    importance: number;
    street?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress: (address: string, suggestion: AddressSuggestion) => void;
  placeholder?: string;
  style?: object;
  label?: string;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelectAddress,
  placeholder = 'Rechercher une adresse...',
  style,
  label,
}: AddressAutocompleteProps): React.JSX.Element {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce pour éviter trop d'appels API
  const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const searchAddress = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    setShowSuggestions(true);

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          query
        )}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        setSuggestions(data.features);
      }
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout
    debounceTimeout.current = setTimeout(() => {
      searchAddress(text);
    }, 300); // 300ms de délai
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const fullAddress = suggestion.properties.label;
    onSelectAddress(fullAddress, suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {suggestions.map(suggestion => (
              <TouchableOpacity
                key={suggestion.properties.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(suggestion)}
              >
                <View style={styles.suggestionIconContainer}>
                  <MapPin size={16} color="#007AFF" />
                </View>
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    {suggestion.properties.name}
                  </Text>
                  <Text style={styles.suggestionContext} numberOfLines={1}>
                    {suggestion.properties.postcode}{' '}
                    {suggestion.properties.city}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
    paddingRight: 44,
  },
  loadingContainer: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 250,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionContext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
