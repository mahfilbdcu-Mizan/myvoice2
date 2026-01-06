import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, GripVertical, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Package {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  real_price: number;
  offer_price: number;
  discount_percentage: number;
  is_popular: boolean;
  is_active: boolean;
  features: string[];
  sort_order: number;
}

export default function AdminPackages() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Package>>({});
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setPackages(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (pkg: Package) => {
    setEditingId(pkg.id);
    setEditForm({
      name: pkg.name,
      description: pkg.description,
      credits: pkg.credits,
      real_price: pkg.real_price,
      offer_price: pkg.offer_price,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
      features: pkg.features || [],
      sort_order: pkg.sort_order,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('packages')
        .update({
          name: editForm.name,
          description: editForm.description,
          credits: editForm.credits,
          real_price: editForm.real_price,
          offer_price: editForm.offer_price,
          is_popular: editForm.is_popular,
          is_active: editForm.is_active,
          features: editForm.features,
          sort_order: editForm.sort_order,
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({ title: "Package updated successfully" });
      setEditingId(null);
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPackage = async () => {
    try {
      const maxOrder = Math.max(...packages.map(p => p.sort_order), 0);
      const { error } = await supabase
        .from('packages')
        .insert({
          name: 'New Package',
          description: 'Package description',
          credits: 100,
          real_price: 20,
          offer_price: 15,
          is_popular: false,
          is_active: false,
          features: ['Feature 1', 'Feature 2'],
          sort_order: maxOrder + 1,
        });

      if (error) throw error;
      toast({ title: "Package added successfully" });
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    
    try {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Package deleted successfully" });
      fetchPackages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && editForm.features) {
      setEditForm({
        ...editForm,
        features: [...editForm.features, newFeature.trim()],
      });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    if (editForm.features) {
      setEditForm({
        ...editForm,
        features: editForm.features.filter((_, i) => i !== index),
      });
    }
  };

  const calculateDiscount = (real: number, offer: number) => {
    if (real <= 0) return 0;
    return Math.round(((real - offer) / real) * 100);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Packages</h1>
            <p className="text-muted-foreground">
              Manage pricing packages - changes reflect across entire site
            </p>
          </div>
          <Button onClick={handleAddPackage}>
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </div>

        <div className="grid gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={!pkg.is_active ? 'opacity-60' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                  <CardTitle className="text-xl">{pkg.name}</CardTitle>
                  {pkg.is_popular && <Badge className="bg-primary">Popular</Badge>}
                  {!pkg.is_active && <Badge variant="secondary">Inactive</Badge>}
                  {pkg.discount_percentage > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      {pkg.discount_percentage}% OFF
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(pkg)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(pkg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingId === pkg.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Package Name</Label>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Credits</Label>
                        <Input
                          type="number"
                          value={editForm.credits || 0}
                          onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Real Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.real_price || 0}
                          onChange={(e) => setEditForm({ ...editForm, real_price: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Offer Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.offer_price || 0}
                          onChange={(e) => setEditForm({ ...editForm, offer_price: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    {editForm.real_price && editForm.offer_price && (
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-sm font-medium text-green-600">
                          Discount: {calculateDiscount(editForm.real_price, editForm.offer_price)}% OFF
                          (${(editForm.real_price - editForm.offer_price).toFixed(2)} savings)
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Features</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editForm.features?.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {feature}
                            <button
                              onClick={() => removeFeature(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a feature..."
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        />
                        <Button type="button" variant="outline" onClick={addFeature}>
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editForm.is_active}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editForm.is_popular}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, is_popular: checked })}
                        />
                        <Label>Popular Badge</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          className="w-20"
                          value={editForm.sort_order || 0}
                          onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Credits</p>
                      <p className="text-2xl font-bold">{pkg.credits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Real Price</p>
                      <p className="text-lg line-through text-muted-foreground">${pkg.real_price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Offer Price</p>
                      <p className="text-2xl font-bold text-primary">${pkg.offer_price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Features</p>
                      <p className="text-sm">{pkg.features?.length || 0} features</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
