import { supabase } from "@/integrations/supabase/client";

// Constants for credit validation
const MAX_CREDITS = 100_000_000; // 100 million max
const MAX_SINGLE_CHANGE = 50_000_000; // 50 million max single change

// Server-side admin verification via edge function
export async function checkIsAdmin(): Promise<boolean> {
  try {
    // First try to get existing session
    const { data: sessionData } = await supabase.auth.getSession();
    
    let accessToken = sessionData.session?.access_token;
    
    // If no session, try refresh
    if (!accessToken) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.access_token) {
        console.log("No valid session for admin check");
        return false;
      }
      accessToken = refreshData.session.access_token;
    }

    const { data, error } = await supabase.functions.invoke('verify-admin', {
      headers: {
        Authorization: `Bearer ${accessToken}`
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
  is_blocked: boolean;
  has_received_free_credits: boolean;
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
  oldCredits?: number;
  newCredits?: number;
}

// Server-side validated admin operation for updating user credits
export async function updateUserCredits(userId: string, credits: number): Promise<UpdateCreditsResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Client-side validation for fast feedback
    if (!Number.isInteger(credits)) {
      return { success: false, error: 'Credits must be an integer' };
    }
    
    if (credits < 0) {
      return { success: false, error: 'Credits cannot be negative' };
    }
    
    if (credits > MAX_CREDITS) {
      return { success: false, error: `Credits cannot exceed ${MAX_CREDITS.toLocaleString()}` };
    }

    // Call server-side admin operation (includes admin verification)
    const { data, error } = await supabase.functions.invoke('admin-operations', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: {
        action: 'update_credits',
        targetUserId: userId,
        credits
      }
    });

    if (error) {
      console.error("Error updating credits:", error);
      return { success: false, error: error.message || 'Failed to update credits' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { 
      success: true, 
      oldCredits: data?.oldCredits,
      newCredits: data?.newCredits
    };
  } catch (error) {
    console.error("Error updating credits:", error);
    return { success: false, error: 'Unexpected error occurred' };
  }
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

// Server-side validated admin operation for approving orders
export async function approveOrder(orderId: string, userId: string, credits: number): Promise<ApproveOrderResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    // Client-side validation for fast feedback
    if (credits < 0 || credits > MAX_CREDITS) {
      return { success: false, error: 'Invalid credit amount in order' };
    }

    // Call server-side admin operation (includes admin verification)
    const { data, error } = await supabase.functions.invoke('admin-operations', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: {
        action: 'approve_order',
        orderId,
        targetUserId: userId,
        credits
      }
    });

    if (error) {
      console.error("Error approving order:", error);
      return { success: false, error: error.message || 'Failed to approve order' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error approving order:", error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

// Server-side validated admin operation for rejecting orders
export async function rejectOrder(orderId: string, notes?: string): Promise<boolean> {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      console.error("Not authenticated");
      return false;
    }

    // Call server-side admin operation (includes admin verification)
    const { data, error } = await supabase.functions.invoke('admin-operations', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      },
      body: {
        action: 'reject_order',
        orderId,
        notes
      }
    });

    if (error) {
      console.error("Error rejecting order:", error);
      return false;
    }

    if (data?.error) {
      console.error("Error rejecting order:", data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error rejecting order:", error);
    return false;
  }
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

// Toggle user block status
export async function toggleUserBlock(userId: string, isBlocked: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("admin_toggle_user_block", {
      _target_user_id: userId,
      _is_blocked: isBlocked
    });
    
    if (error) {
      console.error("Error toggling user block:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error toggling user block:", error);
    return { success: false, error: "Unexpected error occurred" };
  }
}

// Get user profile for admin to view
export async function getUserProfileForAdmin(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
  
  return data;
}
