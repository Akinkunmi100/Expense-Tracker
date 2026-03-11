import { create } from 'zustand';
import { Goal, GoalContribution } from '../types';
import { supabase } from '../lib/supabase';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  fetchGoals: (userId: string) => Promise<void>;
  addGoal: (
    goal: Omit<Goal, 'id' | 'user_id' | 'current_amount' | 'is_completed' | 'created_at'>,
    userId: string
  ) => Promise<void>;
  addContribution: (
    goalId: string,
    amount: number,
    note?: string
  ) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async (userId) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      set({ goals: data as Goal[] });
    }
    set({ isLoading: false });
  },

  addGoal: async (goal, userId) => {
    const payload = {
      ...goal,
      user_id: userId,
      current_amount: 0,
      is_completed: false,
    };
    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      set((state) => ({
        goals: [data as Goal, ...state.goals],
      }));
    }
  },

  addContribution: async (goalId, amount, note) => {
    // Insert contribution
    await supabase.from('goal_contributions').insert({
      goal_id: goalId,
      amount,
      note: note ?? null,
    });
    // Update goal current_amount
    const goal = get().goals.find((g) => g.id === goalId);
    if (goal) {
      const newAmount = goal.current_amount + amount;
      const isCompleted = newAmount >= goal.target_amount;
      await supabase
        .from('goals')
        .update({ current_amount: newAmount, is_completed: isCompleted })
        .eq('id', goalId);
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId
            ? { ...g, current_amount: newAmount, is_completed: isCompleted }
            : g
        ),
      }));
    }
  },

  deleteGoal: async (id) => {
    await supabase.from('goals').delete().eq('id', id);
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
  },
}));
