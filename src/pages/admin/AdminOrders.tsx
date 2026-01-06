import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { getAllOrders, approveOrder, rejectOrder, type CreditOrder } from "@/lib/admin-api";
import { toast } from "@/hooks/use-toast";

export default function AdminOrders() {
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<CreditOrder | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    const data = await getAllOrders();
    setOrders(data);
    setIsLoading(false);
  };

  const handleApprove = async (order: CreditOrder) => {
    setProcessingId(order.id);
    const result = await approveOrder(order.id, order.user_id, order.credits);
    
    if (result.success) {
      toast({
        title: "Order approved",
        description: `Added ${order.credits.toLocaleString()} credits to user`,
      });
      fetchOrders();
    } else {
      toast({
        title: "Approval failed",
        description: result.error || "Could not approve order",
        variant: "destructive",
      });
    }
    setProcessingId(null);
  };

  const handleReject = async () => {
    if (!rejectingOrder) return;
    
    setProcessingId(rejectingOrder.id);
    const success = await rejectOrder(rejectingOrder.id, rejectNotes);
    
    if (success) {
      toast({
        title: "Order rejected",
        description: "Order has been rejected",
      });
      fetchOrders();
    } else {
      toast({
        title: "Rejection failed",
        description: "Could not reject order",
        variant: "destructive",
      });
    }
    setProcessingId(null);
    setRejectingOrder(null);
    setRejectNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning">Pending</Badge>;
      case "approved":
        return <Badge className="bg-success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const processedOrders = orders.filter((o) => o.status !== "pending");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Credit Orders</h1>
          <p className="text-muted-foreground">
            Review and process credit purchase orders
          </p>
        </div>

        {/* Pending Orders */}
        <Card className={pendingOrders.length > 0 ? "border-warning" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Orders
              {pendingOrders.length > 0 && (
                <Badge variant="outline" className="text-warning border-warning">
                  {pendingOrders.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No pending orders
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>TXID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {order.profiles?.full_name || "No name"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.profiles?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {order.credits.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${order.amount_usdt}</span>
                        <span className="text-muted-foreground"> USDT</span>
                      </TableCell>
                      <TableCell>
                        {order.txid ? (
                          <div className="flex items-center gap-1">
                            <code className="rounded bg-muted px-2 py-1 text-xs">
                              {order.txid.slice(0, 10)}...
                            </code>
                            <a
                              href={`https://tronscan.org/#/transaction/${order.txid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleApprove(order)}
                            disabled={processingId === order.id}
                          >
                            {processingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setRejectingOrder(order)}
                            disabled={processingId === order.id}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {processedOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No processed orders yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Processed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">
                          {order.profiles?.email || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell>{order.credits.toLocaleString()}</TableCell>
                      <TableCell>${order.amount_usdt} USDT</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.processed_at
                          ? new Date(order.processed_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={!!rejectingOrder} onOpenChange={() => setRejectingOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
              <DialogDescription>
                Add a note explaining why this order is being rejected (optional)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Rejection reason..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingOrder(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
