import React from 'react';
import { render } from '@testing-library/react-native';
import Decorations from '../Decorations';

describe('Decorations', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Decorations />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders 4 view components for decorations', () => {
    const { UNSAFE_getAllByType } = render(<Decorations />);
    const { View } = require('react-native');
    const views = UNSAFE_getAllByType(View);
    // There are 4 views rendered
    expect(views.length).toBe(4);
  });
});
