import { supabase } from "@/integrations/supabase/client";

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
  
  return data !== null;
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

export async function updateUserCredits(userId: string, credits: number): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ credits })
    .eq("id", userId);
  
  if (error) {
    console.error("Error updating credits:", error);
    return false;
  }
  
  return true;
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

export async function approveOrder(orderId: string, userId: string, credits: number): Promise<boolean> {
  // First update the order status
  const { error: orderError } = await supabase
    .from("credit_orders")
    .update({ 
      status: "approved",
      processed_at: new Date().toISOString()
    })
    .eq("id", orderId);
  
  if (orderError) {
    console.error("Error approving order:", orderError);
    return false;
  }
  
  // Then add credits to user
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  
  if (fetchError || !profile) {
    console.error("Error fetching profile:", fetchError);
    return false;
  }
  
  const newCredits = (profile.credits || 0) + credits;
  
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ credits: newCredits })
    .eq("id", userId);
  
  if (updateError) {
    console.error("Error updating credits:", updateError);
    return false;
  }
  
  return true;
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
