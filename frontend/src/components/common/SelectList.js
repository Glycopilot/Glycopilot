import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Pressable } from 'react-native';

export default function SelectList({
  options = [],
  value,
  onValueChange = () => {},
  placeholder = 'Choisir',
  labelKey = 'name',
  style,
  renderItemLabel,
}) {
  const [open, setOpen] = useState(false);

  const selectedLabel = (() => {
    if (!value) return null;
    const found = options && options.find(o => o[labelKey] === value);
    if (found) return found[labelKey];
    return value;
  })();

  function handleSelect(item) {
    const val = item[labelKey] ?? item;
    setOpen(false);
    onValueChange(val);
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={styles.buttonText} numberOfLines={1} ellipsizeMode={'tail'}>{selectedLabel || placeholder}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <FlatList
            data={options}
            keyExtractor={(item, idx) => `${String(item.id ?? item[labelKey] ?? item.name ?? idx)}-${idx}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)} activeOpacity={0.8}>
                <Text style={styles.itemLabel} numberOfLines={1} ellipsizeMode={'tail'}>{renderItemLabel ? renderItemLabel(item) : (item[labelKey] ?? String(item))}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  button: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E8F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  sheet: {
    maxHeight: '60%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  itemLabel: {
    fontSize: 16,
  },
});