import { supabase } from "@/integrations/supabase/client";

// Constants for credit validation
const MAX_CREDITS = 100_000_000; // 100 million max
const MAX_SINGLE_CHANGE = 50_000_000; // 50 million max single change

// Server-side admin verification via edge function
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      console.error("No active session for admin check");
      return false;
    }

    const { data, error } = await supabase.functions.invoke('verify-admin', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });

    if (error) {
      console.error("Error verifying admin status:", error);
      return false;
    }

    return data?.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  created_at: string;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  
  return data || [];
}

export interface UpdateCreditsResult {
  success: boolean;
  error?: string;
}

export async function updateUserCredits(userId: string, credits: number): Promise<UpdateCreditsResult> {
  // Validate credits is an integer
  if (!Number.isInteger(credits)) {
    return { success: false, error: 'Credits must be an integer' };
  }
  
  // Validate lower bound
  if (credits < 0) {
    return { success: false, error: 'Credits cannot be negative' };
  }
  
  // Validate upper bound
  if (credits > MAX_CREDITS) {
    return { success: false, error: `Credits cannot exceed ${MAX_CREDITS.toLocaleString()}` };
  }
  
  // Get current credits to validate change amount
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  
  if (fetchError) {
    console.error("Error fetching profile:", fetchError);
    return { success: false, error: 'Failed to fetch user profile' };
  }
  
  if (profile) {
    const difference = Math.abs(credits - (profile.credits || 0));
    if (difference > MAX_SINGLE_CHANGE) {
      return { 
        success: false, 
        error: `Single change cannot exceed ${MAX_SINGLE_CHANGE.toLocaleString()} credits` 
      };
    }
  }
  
  const { error } = await supabase
    .from("profiles")
    .update({ credits })
    .eq("id", userId);
  
  if (error) {
    console.error("Error updating credits:", error);
    return { success: false, error: 'Database error updating credits' };
  }
  
  return { success: true };
}

export interface CreditOrder {
  id: string;
  user_id: string;
  credits: number;
  amount_usdt: number;
  txid: string | null;
  wallet_address: string | null;
  network: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

export async function getAllOrders(): Promise<CreditOrder[]> {
  const { data: orders, error } = await supabase
    .from("credit_orders")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  // Fetch profiles separately for each order
  const ordersWithProfiles: CreditOrder[] = [];
  
  for (const order of orders || []) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    
    ordersWithProfiles.push({
      ...order,
      profiles: profile || undefined
    });
  }
  
  return ordersWithProfiles;
}

export interface ApproveOrderResult {
  success: boolean;
  error?: string;
}

export async function approveOrder(orderId: string, userId: string, credits: number): Promise<ApproveOrderResult> {
  // Validate credits from order
  if (credits < 0 || credits > MAX_CREDITS) {
    return { success: false, error: 'Invalid credit amount in order' };
  }
  
  // Get current profile to check for overflow
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  
  if (fetchError || !profile) {
    console.error("Error fetching profile:", fetchError);
    return { success: false, error: 'User profile not found' };
  }
  
  // Check for overflow
  const newCredits = (profile.credits || 0) + credits;
  if (newCredits > MAX_CREDITS) {
    return { 
      success: false, 
      error: `Adding ${credits.toLocaleString()} credits would exceed maximum balance of ${MAX_CREDITS.toLocaleString()}` 
    };
  }
  
  // Update order status
  const { error: orderError } = await supabase
    .from("credit_orders")
    .update({ 
      status: "approved",
      processed_at: new Date().toISOString()
    })
    .eq("id", orderId);
  
  if (orderError) {
    console.error("Error approving order:", orderError);
    return { success: false, error: 'Failed to update order status' };
  }
  
  // Update credits
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);
  
  if (updateError) {
    console.error("Error updating credits:", updateError);
    return { success: false, error: 'Failed to update user credits' };
  }
  
  return { success: true };
}

export async function rejectOrder(orderId: string, notes?: string): Promise<boolean> {
  const { error } = await supabase
    .from("credit_orders")
    .update({ 
      status: "rejected",
      admin_notes: notes || null,
      processed_at: new Date().toISOString()
    })
    .eq("id", orderId);
  
  if (error) {
    console.error("Error rejecting order:", error);
    return false;
  }
  
  return true;
}

export interface AdminStats {
  totalUsers: number;
  totalCreditsIssued: number;
  pendingOrders: number;
  totalRevenue: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  // Get total users
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  
  // Get total credits across all users
  const { data: creditData } = await supabase
    .from("profiles")
    .select("credits");
  
  const totalCredits = creditData?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;
  
  // Get pending orders count
  const { count: pendingCount } = await supabase
    .from("credit_orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  
  // Get total revenue from approved orders
  const { data: revenueData } = await supabase
    .from("credit_orders")
    .select("amount_usdt")
    .eq("status", "approved");
  
  const totalRevenue = revenueData?.reduce((sum, o) => sum + Number(o.amount_usdt || 0), 0) || 0;
  
  return {
    totalUsers: userCount || 0,
    totalCreditsIssued: totalCredits,
    pendingOrders: pendingCount || 0,
    totalRevenue
  };
}
