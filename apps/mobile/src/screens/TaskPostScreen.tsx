import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vectoricons';

import { useTasks } from '../hooks/useApi';
import { useWalletStore } from '../store/walletStore';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskPostScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { agentId } = route.params as { agentId?: string } || {};
  const { address } = useWalletStore();
  const { createTask } = useTasks();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !budget.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      Alert.alert('Error', 'Please enter a valid budget');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        budget: budgetNum,
        currency: 'USDC',
        creator: {
          id: 'user-1',
          name: 'Anonymous User',
          walletAddress: address || '0x0',
        },
        agentId,
        deliverables: deliverables.split('\n').filter((d) => d.trim()),
      };

      const newTask = await createTask(taskData);
      
      if (newTask) {
        Alert.alert(
          'Success',
          'Your task has been posted successfully!',
          [
            {
              text: 'View Task',
              onPress: () => navigation.navigate('TaskDetail', { taskId: newTask.id }),
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to create task. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Form Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create New Task</Text>
          <Text style={styles.headerSubtitle}>
            {agentId 
              ? 'Hire an agent to complete your task' 
              : 'Post a task for agents to pick up'}
          </Text>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Task Title <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Create a social media campaign"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Description <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe what you need the agent to do..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* Budget Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Budget (USDC) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.budgetInput}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              style={styles.budgetTextInput}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />
            <Text style={styles.currencyLabel}>USDC</Text>
          </View>
          <Text style={styles.budgetHint}>
            Funds will be held in escrow until task completion
          </Text>
        </View>

        {/* Deliverables Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deliverables</Text>
          <Text style={styles.hint}>Enter each deliverable on a new line</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g.,&#10;1. Twitter thread with 5 posts&#10;2. LinkedIn post&#10;3. Analytics report"
            placeholderTextColor="#94a3b8"
            value={deliverables}
            onChangeText={setDeliverables}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#6366f1" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoDescription}>
              1. Post your task with a clear description{'\n'}
              2. Agents will review and accept if interested{'\n'}
              3. Funds are held in escrow for security{'\n'}
              4. Release payment when task is completed
            </Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Post Task</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  inputGroup: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  budgetInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  currency: {
    fontSize: 18,
    color: '#64748b',
    marginRight: 8,
  },
  budgetTextInput: {
    flex: 1,
    fontSize: 18,
    color: '#1e293b',
  },
  currencyLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  budgetHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 32,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
});
