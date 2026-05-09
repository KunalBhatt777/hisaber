import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

// Android needs two separate dialogs: date then time
function AndroidPicker({ value, onChange }: Props) {
  const [step, setStep] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date>(value);
  const colors = useAppTheme();

  const handleDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setPendingDate(selected);
      setStep('time');
    } else {
      setStep(null);
    }
  };

  const handleTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    setStep(null);
    if (selected) {
      const combined = new Date(pendingDate);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(combined);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.field}
        onPress={() => { setPendingDate(value); setStep('date'); }}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.fieldText, { color: colors.text }]}>
          {formatDate(value)} · {formatTime(value)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      {step === 'date' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {step === 'time' && (
        <DateTimePicker
          value={pendingDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </>
  );
}

// iOS shows spinner in a bottom modal
function IOSPicker({ value, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(value);
  const colors = useAppTheme();

  const open = () => { setDraft(value); setVisible(true); };
  const confirm = () => { onChange(draft); setVisible(false); };
  const cancel = () => setVisible(false);

  return (
    <>
      <TouchableOpacity style={styles.field} onPress={open} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.fieldText, { color: colors.text }]}>
          {formatDate(value)} · {formatTime(value)}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={cancel}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <DateTimePicker
              value={draft}
              mode="datetime"
              display="spinner"
              onChange={(_, d) => { if (d) setDraft(d); }}
              style={{ width: '100%' }}
              textColor={colors.text}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={cancel} style={styles.sheetBtn}>
                <Text style={[styles.sheetBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={styles.sheetBtn}>
                <Text style={[styles.sheetBtnText, { color: colors.primary, fontWeight: '700' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function DateTimeField(props: Props) {
  return Platform.OS === 'ios' ? <IOSPicker {...props} /> : <AndroidPicker {...props} />;
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
  },
  fieldText: { flex: 1, fontSize: 15, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, marginBottom: 8 },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingTop: 8 },
  sheetBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  sheetBtnText: { fontSize: 17 },
});
