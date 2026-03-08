import React, { useState, useCallback, useRef } from 'react';
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
import { Pill, X } from 'lucide-react-native';
import { colors } from '../../themes/colors';
import type { FdaMedicationResult } from '../../types/medications.types';

// ─── types ────────────────────────────────────────────────────────────────────

export interface MedicationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectMedication: (medication: FdaMedicationResult) => void;
  placeholder?: string;
  label?: string;
  style?: object;
}

// ─── OpenFDA helpers ──────────────────────────────────────────────────────────

interface FdaLabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
  };
}

interface FdaResponse {
  results?: FdaLabelResult[];
}

async function fetchFdaSuggestions(query: string): Promise<FdaMedicationResult[]> {
  // Encode the query text but append * outside encoding (wildcard for prefix search)
  const encoded = encodeURIComponent(query.trim());
  const search = `openfda.brand_name:${encoded}*+openfda.generic_name:${encoded}*`;
  const url = `https://api.fda.gov/drug/label.json?search=${search}&limit=10`;
  const res = await fetch(url);
  // OpenFDA returns 404 when no results — treat as empty, not an error
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`FDA API error: ${res.status}`);
  const json: FdaResponse = await res.json();
  const seen = new Set<string>();
  const results: FdaMedicationResult[] = [];
  for (const item of json.results ?? []) {
    const brandName = item.openfda?.brand_name?.[0] ?? '';
    const genericName = item.openfda?.generic_name?.[0] ?? '';
    if (!brandName) continue;
    const key = `${brandName}|${genericName}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ brandName, genericName });
    }
  }
  return results;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function MedicationAutocomplete({
  value,
  onChangeText,
  onSelectMedication,
  placeholder = 'Rechercher un médicament...',
  label,
  style,
}: MedicationAutocompleteProps): React.JSX.Element {
  const [suggestions, setSuggestions] = useState<FdaMedicationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearched(false);
      setError(false);
      return;
    }
    setLoading(true);
    setShowSuggestions(true);
    setError(false);
    try {
      const results = await fetchFdaSuggestions(query);
      setSuggestions(results);
    } catch {
      setError(true);
      setSuggestions([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);
      setSearched(false);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => search(text), 300);
    },
    [onChangeText, search]
  );

  const handleSelect = useCallback(
    (item: FdaMedicationResult) => {
      onSelectMedication(item);
      onChangeText(item.brandName);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearched(false);
      Keyboard.dismiss();
    },
    [onSelectMedication, onChangeText]
  );

  const handleClear = useCallback(() => {
    onChangeText('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSearched(false);
    setError(false);
  }, [onChangeText]);

  const isEmpty = searched && !error && suggestions.length === 0;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputContainer}>
        <View style={styles.pillIcon}>
          <Pill size={16} color="#007AFF" />
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="words"
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        <View style={styles.inputRight}>
          {loading && <ActivityIndicator size="small" color="#007AFF" />}
          {!loading && value.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showSuggestions && (suggestions.length > 0 || isEmpty || error) && (
        <View style={styles.dropdown}>
          <ScrollView
            style={styles.dropdownScroll}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {error ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Erreur lors de la recherche</Text>
              </View>
            ) : isEmpty ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Aucun médicament trouvé</Text>
              </View>
            ) : (
              suggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.brandName}-${index}`}
                  style={[
                    styles.suggestionRow,
                    index < suggestions.length - 1 && styles.suggestionRowBorder,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionIcon}>
                    <Pill size={15} color="#007AFF" />
                  </View>
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.brandName}
                    </Text>
                    {item.genericName ? (
                      <Text style={styles.suggestionGeneric} numberOfLines={1}>
                        {item.genericName}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    gap: 8,
  },
  pillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputRight: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    maxHeight: 260,
    zIndex: 1001,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 260,
  },
  emptyRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  suggestionGeneric: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
