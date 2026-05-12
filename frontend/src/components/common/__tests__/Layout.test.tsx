import React from 'react';
import { render } from '@testing-library/react-native';
import Layout from '../Layout';
import { Text } from 'react-native';

// Mock sub-components to avoid deep render issues
jest.mock('../Header', () => {
  const { Text } = require('react-native');
  return () => <Text>Header</Text>;
});

jest.mock('../Navbar', () => {
  const { Text } = require('react-native');
  return () => <Text>Navbar</Text>;
});

const mockNavigation = { navigate: jest.fn() };

describe('Layout', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Layout navigation={mockNavigation}>
        <Text>Page Content</Text>
      </Layout>,
    );
    expect(getByText('Page Content')).toBeTruthy();
  });

  it('renders Header component', () => {
    const { getByText } = render(
      <Layout navigation={mockNavigation}>
        <Text>Content</Text>
      </Layout>,
    );
    expect(getByText('Header')).toBeTruthy();
  });

  it('renders Navbar component', () => {
    const { getByText } = render(
      <Layout navigation={mockNavigation}>
        <Text>Content</Text>
      </Layout>,
    );
    expect(getByText('Navbar')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <Layout navigation={mockNavigation}>
        <Text>Child 1</Text>
        <Text>Child 2</Text>
      </Layout>,
    );
    expect(getByText('Child 1')).toBeTruthy();
    expect(getByText('Child 2')).toBeTruthy();
  });
});
