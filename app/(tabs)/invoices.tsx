import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Platform, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useEffect, useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';

export default function InvoicesScreen() {
  const { profile } = useAuthStore();
  const { invoices, fetchInvoices, isLoading, updateInvoiceStatus, deleteInvoice } = useInvoiceStore();
  const { addTransaction } = useTransactionStore();
  const router = useRouter();
  
  useEffect(() => {
    if (profile?.id) {
      fetchInvoices(profile.id);
    }
  }, [profile?.id]);

  const handleGeneratePdf = async (invoice: any) => {
    try {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Invoice #${invoice.invoice_number}</h1>
            <p><strong>Customer:</strong> ${invoice.customer_name}</p>
            <p><strong>Total:</strong> ${profile?.currency} ${invoice.total}</p>
            <p><strong>Status:</strong> ${invoice.status}</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      Alert.alert('Error', 'Could not generate or share PDF.');
    }
  };

  const handleMarkPaid = async (item: any) => {
    try {
      await updateInvoiceStatus(item.id, 'Paid');
      // Link to business ledger
      if (profile?.id) {
        await addTransaction({
          amount: item.total,
          description: `Invoice: #${item.invoice_number} - ${item.customer_name}`,
          category: 'Sales & Revenue' as any,
          date: new Date().toISOString(),
          is_recurring: false,
          recurrence_interval: null,
          payment_method: null,
          notes: 'Auto-recorded from paid invoice.',
        }, profile.id, 'business');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to mark invoice as paid.');
    }
  };

  const renderInvoice = ({ item }: { item: any }) => (
    <View style={styles.invoiceCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.invoiceNumber}>#{item.invoice_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.totalAmount}>{profile?.currency} {item.total}</Text>
        <Text style={styles.dateText}>Due: {item.due_date || 'N/A'}</Text>
      </View>
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleGeneratePdf(item)}>
          <Ionicons name="document-text-outline" size={18} color={Colors.business} />
          <Text style={styles.actionText}>PDF</Text>
        </TouchableOpacity>
        {item.status === 'Draft' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => updateInvoiceStatus(item.id, 'Sent')}>
            <Ionicons name="paper-plane-outline" size={18} color={Colors.business} />
            <Text style={styles.actionText}>Mark Sent</Text>
          </TouchableOpacity>
        )}
        {item.status === 'Sent' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleMarkPaid(item)}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
            <Text style={styles.actionText}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return Colors.success;
      case 'Sent': return Colors.business;
      case 'Overdue': return Colors.danger;
      default: return Colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/inventory')}>
            <Ionicons name="cube-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => Alert.alert('Coming soon', 'Create invoice view')}>
            <Ionicons name="add" size={24} color={Colors.background} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoice}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={Colors.border} />
            <Text style={styles.emptyText}>No invoices yet</Text>
            <Text style={styles.emptySubText}>Create your first invoice to get paid faster.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  createBtn: {
    backgroundColor: Colors.business,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  invoiceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  invoiceNumber: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 16,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
});
