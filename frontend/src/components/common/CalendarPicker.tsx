import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { colors } from '../../themes/colors';

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  onReset?: () => void;
  maxDate?: Date;
  showResetButton?: boolean;
}

export default function CalendarPicker({
  visible,
  selectedDate,
  onDateSelect,
  onClose,
  onReset,
  maxDate = new Date(),
  showResetButton = false,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ];

  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    const next = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    if (next <= maxDate) {
      setCurrentMonth(next);
    }
  };

  const isDateSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return date > maxDate;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const canGoNext = () => {
    const next = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1
    );
    return next <= maxDate;
  };

  const handleDatePress = (day: number) => {
    if (!isDateDisabled(day)) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      onDateSelect(date);
    }
  };

  const renderDays = () => {
    const days = [];
    const totalSlots = 42; // 6 weeks * 7 days

    for (let i = 0; i < totalSlots; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;
      const isSelected = isValidDay && isDateSelected(dayNumber);
      const isDisabled = isValidDay && isDateDisabled(dayNumber);
      const isTodayDay = isValidDay && isToday(dayNumber);

      days.push(
        <TouchableOpacity
          key={i}
          disabled={!isValidDay || isDisabled}
          onPress={() => handleDatePress(dayNumber)}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            isTodayDay && !isSelected && styles.calendarDayToday,
          ]}
          activeOpacity={0.7}
        >
          {isValidDay && (
            <View style={styles.dayContent}>
              <Text
                style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                  isDisabled && styles.calendarDayTextDisabled,
                  isTodayDay && !isSelected && styles.calendarDayTextToday,
                ]}
              >
                {dayNumber}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.calendarModal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une date</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Calendar Navigation */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity
                  onPress={previousMonth}
                  style={styles.calendarNavButton}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.calendarMonthText}>
                  {monthNames[currentMonth.getMonth()]}{' '}
                  {currentMonth.getFullYear()}
                </Text>

                <TouchableOpacity
                  onPress={nextMonth}
                  style={[
                    styles.calendarNavButton,
                    !canGoNext() && styles.calendarNavButtonDisabled,
                  ]}
                  disabled={!canGoNext()}
                  activeOpacity={0.7}
                >
                  <ChevronRight
                    size={24}
                    color={
                      canGoNext() ? colors.textPrimary : colors.textSecondary
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Week Days */}
              <View style={styles.calendarWeekDays}>
                {weekDays.map((day, index) => (
                  <View key={index} style={styles.calendarWeekDay}>
                    <Text style={styles.calendarWeekDayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>{renderDays()}</View>
            </View>

            {/* Footer Actions */}
            <View style={styles.modalFooter}>
              {showResetButton && onReset && (
                <TouchableOpacity
                  onPress={() => {
                    onReset();
                    onClose();
                  }}
                  style={styles.todayButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.todayButtonText}>Aujourd'hui</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.closeButton,
                  !showResetButton && styles.closeButtonFull,
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
  },
  calendarModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },

  // Calendar
  calendarContainer: {
    width: '100%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  calendarNavButtonDisabled: {
    opacity: 0.3,
  },
  calendarMonthText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // Week Days
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
  },
  calendarWeekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Calendar Grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  calendarDaySelected: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#007AFF',
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: colors.textSecondary,
    opacity: 0.3,
  },

  // Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  todayButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonFull: {
    flex: 1,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
