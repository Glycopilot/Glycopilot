import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import JournalScreen from '../Journal';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

describe('Journal Screen', () => {
    beforeEach(() => jest.clearAllMocks());

    it('rend le titre "Mon journal"', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        expect(getByText('Mon journal')).toBeTruthy();
    });

    it('se monte sans erreur', () => {
        expect(() =>
            render(<JournalScreen navigation={mockNavigation as any} />)
        ).not.toThrow();
    });

    it('affiche les 3 cartes : Repas, Médicaments, Activité physique', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        expect(getByText('Repas')).toBeTruthy();
        expect(getByText('Médicaments')).toBeTruthy();
        expect(getByText('Activité physique')).toBeTruthy();
    });

    it('navigue vers Repas quand la carte Repas est pressée', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByText('Repas'));
        expect(mockNavigate).toHaveBeenCalledWith('Repas');
    });

    it('navigue vers Traitements quand la carte Médicaments est pressée', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByText('Médicaments'));
        expect(mockNavigate).toHaveBeenCalledWith('Traitements');
    });

    it('navigue vers Activite quand la carte Activité physique est pressée', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        fireEvent.press(getByText('Activité physique'));
        expect(mockNavigate).toHaveBeenCalledWith('Activite');
    });

    it('affiche le sous-titre descriptif', () => {
        const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
        expect(getByText('Repas, médicaments et activité au quotidien')).toBeTruthy();
    });
});
