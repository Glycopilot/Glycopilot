import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddMealModal, { calcItemGlucides } from '../AddMealModal';
import type { ComposedItem, MealReference, MealType } from '../../../types/meals.types';

jest.mock('../../../services/mealService', () => ({
  default: {
    searchOpenFoodFacts: jest.fn().mockResolvedValue([]),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<ComposedItem> = {}): ComposedItem {
  return {
    tempId: 'test-id-1',
    name: 'Pomme',
    selectedRef: null,
    portionG: '150',
    glucidesRaw: '10',
    caloriesRaw: '52',
    ...overrides,
  };
}

const defaultProps = {
  visible: true,
  submitting: false,
  composedItems: [],
  mealType: 'lunch' as MealType,
  prefillRef: null,
  onPrefillConsumed: jest.fn(),
  onMealTypeChange: jest.fn(),
  onAddItem: jest.fn(),
  onRemoveItem: jest.fn(),
  onOpenScanner: jest.fn(),
  onClose: jest.fn(),
  onSubmit: jest.fn(),
};

// ─── calcItemGlucides ────────────────────────────────────────────────────────

describe('calcItemGlucides', () => {
  it('computes glucides correctly for a given portion', () => {
    expect(calcItemGlucides(makeItem({ glucidesRaw: '10', portionG: '150' }))).toBe(15);
  });

  it('rounds to 1 decimal place', () => {
    expect(calcItemGlucides(makeItem({ glucidesRaw: '12.5', portionG: '80' }))).toBe(10);
  });

  it('returns null when portion is empty', () => {
    expect(calcItemGlucides(makeItem({ portionG: '' }))).toBeNull();
  });

  it('returns null when glucides is empty', () => {
    expect(calcItemGlucides(makeItem({ glucidesRaw: '' }))).toBeNull();
  });

  it('returns null when portion is 0', () => {
    expect(calcItemGlucides(makeItem({ portionG: '0' }))).toBeNull();
  });

  it('returns null for non-numeric values', () => {
    expect(calcItemGlucides(makeItem({ glucidesRaw: 'abc', portionG: '150' }))).toBeNull();
  });

  it('handles decimal glucides', () => {
    expect(calcItemGlucides(makeItem({ glucidesRaw: '5.5', portionG: '200' }))).toBe(11);
  });
});

// ─── AddMealModal component ───────────────────────────────────────────────────

describe('AddMealModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <AddMealModal {...defaultProps} visible={false} />
    );
    expect(queryByText('Composer un repas')).toBeNull();
  });

  it('renders title when visible', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    expect(getByText('Composer un repas')).toBeTruthy();
  });

  it('renders all 4 meal types', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    expect(getByText('Petit-déjeuner')).toBeTruthy();
    expect(getByText('Déjeuner')).toBeTruthy();
    expect(getByText('Collation')).toBeTruthy();
    expect(getByText('Dîner')).toBeTruthy();
  });

  it('add button is disabled when name is empty', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    fireEvent.press(getByText('Ajouter un aliment'));
    expect(defaultProps.onAddItem).not.toHaveBeenCalled();
  });

  it('calls onMealTypeChange when a type is selected', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    fireEvent.press(getByText('Dîner'));
    expect(defaultProps.onMealTypeChange).toHaveBeenCalledWith('dinner');
  });

  it('calls onOpenScanner when Scanner tab is pressed', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    fireEvent.press(getByText('Scanner'));
    expect(defaultProps.onOpenScanner).toHaveBeenCalled();
  });

  it('calls onClose when Annuler is pressed', () => {
    const { getByText } = render(<AddMealModal {...defaultProps} />);
    fireEvent.press(getByText('Annuler'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders chips for composed items', () => {
    const items: ComposedItem[] = [
      makeItem({ tempId: '1', name: 'Pomme', glucidesRaw: '10', portionG: '150' }),
      makeItem({ tempId: '2', name: 'Yaourt', glucidesRaw: '8', portionG: '125' }),
    ];
    const { getByText } = render(
      <AddMealModal {...defaultProps} composedItems={items} />
    );
    expect(getByText(/Pomme/)).toBeTruthy();
    expect(getByText(/Yaourt/)).toBeTruthy();
    expect(getByText('Aliments ajoutés')).toBeTruthy();
  });

  it('shows total glucides badge when items are added', () => {
    const items: ComposedItem[] = [
      makeItem({ tempId: '1', name: 'Pomme', glucidesRaw: '10', portionG: '100' }),
      makeItem({ tempId: '2', name: 'Pain', glucidesRaw: '50', portionG: '60' }),
    ];
    const { getByText } = render(
      <AddMealModal {...defaultProps} composedItems={items} />
    );
    // 10g/100g * 100g = 10g + 50g/100g * 60g = 30g => total 40g
    expect(getByText('40g glucides')).toBeTruthy();
  });

  it('prefills form from prefillRef', async () => {
    const ref: MealReference = {
      meal_id: 5,
      name: 'Cristalline fraise',
      calories: 30,
      glucides: 7.5,
      proteines: 0,
      lipides: 0,
      glucose: null,
      barcode: '3274080005003',
      source: 'openfood',
      link_photo: null,
    };
    const { getByDisplayValue } = render(
      <AddMealModal {...defaultProps} prefillRef={ref} />
    );
    await waitFor(() => {
      expect(getByDisplayValue('Cristalline fraise')).toBeTruthy();
    });
  });

  it('shows spinner when submitting', () => {
    const { UNSAFE_getByType } = render(
      <AddMealModal
        {...defaultProps}
        submitting={true}
        composedItems={[makeItem()]}
      />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });
});
