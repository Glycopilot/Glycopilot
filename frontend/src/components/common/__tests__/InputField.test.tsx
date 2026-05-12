import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InputField from '../InputField';

describe('InputField', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <InputField
        value=""
        onChangeText={jest.fn()}
        placeholder="Entrez votre email"
      />,
    );
    expect(getByPlaceholderText('Entrez votre email')).toBeTruthy();
  });

  it('renders with label', () => {
    const { getByText } = render(
      <InputField
        label="Email"
        value=""
        onChangeText={jest.fn()}
      />,
    );
    expect(getByText('Email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <InputField
        value=""
        onChangeText={onChangeText}
        placeholder="Type here"
      />,
    );
    fireEvent.changeText(getByPlaceholderText('Type here'), 'hello');
    expect(onChangeText).toHaveBeenCalledWith('hello');
  });

  it('renders with current value', () => {
    const { getByDisplayValue } = render(
      <InputField
        value="test@example.com"
        onChangeText={jest.fn()}
      />,
    );
    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('renders without label when not provided', () => {
    const { queryByText } = render(
      <InputField value="" onChangeText={jest.fn()} />,
    );
    // No label element expected
    expect(queryByText('Email')).toBeNull();
  });

  it('renders with icon', () => {
    const icon = <></>;
    const { getByPlaceholderText } = render(
      <InputField
        value=""
        onChangeText={jest.fn()}
        placeholder="With icon"
        icon={icon}
      />,
    );
    expect(getByPlaceholderText('With icon')).toBeTruthy();
  });

  it('renders with rightElement', () => {
    const rightEl = <></>;
    const { getByPlaceholderText } = render(
      <InputField
        value=""
        onChangeText={jest.fn()}
        placeholder="With right"
        rightElement={rightEl}
      />,
    );
    expect(getByPlaceholderText('With right')).toBeTruthy();
  });
});
