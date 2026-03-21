import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Swipeable } from 'react-native-gesture-handler';

import { useAppTheme } from '../theme';
import { useHomeViewModel } from '../viewmodels/useHomeViewModel';
import { DrawerToggleButton } from '../navigation/AppNavigator';
import FAB from '../components/FAB';
import { HomeStackParamList, Sheet } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ─── Sheet Card ───────────────────────────────────────────────────────────────

function SheetCard({
  sheet,
  onPress,
  onDelete,
}: {
  sheet: Sheet;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useAppTheme();

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={onDelete}
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      >
        <Animated.Text
          style={[styles.deleteActionText, { transform: [{ scale }] }]}
        >
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {sheet.name}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {sheet.item_count} {sheet.item_count === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Text style={[styles.cardTotal, { color: colors.primary }]}>
          {formatCurrency(sheet.total)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Create Sheet Modal ───────────────────────────────────────────────────────

function CreateSheetModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const colors = useAppTheme();
  const [name, setName] = useState('');

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setName('');
  };

  const handleCancel = () => {
    setName('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.modalOverlay} onPress={handleCancel}>
        <Pressable
          style={[styles.modalBox, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            New Sheet
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="Sheet name (e.g. Groceries, Trip)"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.modalBtn}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
              disabled={!name.trim()}
            >
              <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useAppTheme();
  const vm = useHomeViewModel();
  const [showModal, setShowModal] = useState(false);

  const handleCreate = (name: string) => {
    const id = vm.createSheet(name);
    setShowModal(false);
    navigation.navigate('Sheet', { sheetId: id, sheetName: name });
  };

  const confirmDelete = (sheet: Sheet) => {
    Alert.alert(
      'Delete Sheet',
      `Delete "${sheet.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => vm.deleteSheet(sheet.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <DrawerToggleButton />
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.appTitle, { color: colors.primary }]}>
            Hisaber
          </Text>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Welcome, {vm.userName}
          </Text>
        </View>
      </View>

      {/* Sheet List */}
      <FlatList
        data={vm.sheets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No sheets yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap + to create your first expense sheet
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <SheetCard
            sheet={item}
            onPress={() =>
              navigation.navigate('Sheet', {
                sheetId: item.id,
                sheetName: item.name,
              })
            }
            onDelete={() => confirmDelete(item)}
          />
        )}
      />

      {/* Section label */}
      {vm.sheets.length > 0 && (
        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            SHEETS
          </Text>
        </View>
      )}

      <FAB onPress={() => setShowModal(true)} />

      <CreateSheetModal
        visible={showModal}
        onConfirm={handleCreate}
        onCancel={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 14,
  },
  headerTitleBlock: { flex: 1 },
  appTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  greeting: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  listContent: { flexGrow: 1, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 13, marginTop: 2 },
  cardTotal: { fontSize: 18, fontWeight: '700' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 20 },
  sectionHeader: { paddingHorizontal: 20, paddingBottom: 4, marginTop: -8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '82%',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalBtnPrimary: {},
  modalBtnText: { fontSize: 15, fontWeight: '600' },
});
