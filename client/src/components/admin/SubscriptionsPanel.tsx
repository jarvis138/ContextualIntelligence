import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MoreHorizontal, Plus, RefreshCcw, Search } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Subscription status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeColor = () => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "past_due":
        return "bg-yellow-500";
      case "unpaid":
        return "bg-red-500";
      case "canceled":
        return "bg-gray-500";
      case "trialing":
        return "bg-blue-500";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <Badge className={`${getBadgeColor()} text-white`}>
      {status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
    </Badge>
  );
};

// Plan badge component
const PlanBadge = ({ plan }: { plan: string }) => {
  const getBadgeVariant = () => {
    switch (plan) {
      case "free":
        return "outline";
      case "starter":
        return "secondary";
      case "business":
        return "default";
      case "enterprise":
        return "destructive";
      case "custom":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Badge variant={getBadgeVariant()} className="capitalize">
      {plan}
    </Badge>
  );
};

// Subscription dialog component (Add/Edit)
const SubscriptionDialog = ({
  subscription = null,
  onClose,
  isOpen,
}: {
  subscription?: any;
  onClose: () => void;
  isOpen: boolean;
}) => {
  const isEditing = !!subscription;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    organizationId: subscription?.organizationId || "",
    plan: subscription?.plan || "starter",
    status: subscription?.status || "active",
    billingInterval: subscription?.billingInterval || "monthly",
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
    currentPeriodStart: subscription?.currentPeriodStart 
      ? new Date(subscription.currentPeriodStart).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
    currentPeriodEnd: subscription?.currentPeriodEnd 
      ? new Date(subscription.currentPeriodEnd).toISOString().split("T")[0] 
      : new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0],
    price: subscription?.price?.toString() || "0",
    currency: subscription?.currency || "USD",
    notes: subscription?.notes || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organizations for dropdown
  const { data: organizations = [] } = useQuery({
    queryKey: ["/admin-api/organizations"],
    enabled: isOpen,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert price to number
      const dataToSubmit = {
        ...formData,
        price: parseFloat(formData.price),
      };

      const url = isEditing
        ? `/admin-api/subscriptions/${subscription.id}`
        : "/admin-api/subscriptions";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      toast({
        title: `Subscription ${isEditing ? "updated" : "created"} successfully`,
        description: `The subscription has been ${isEditing ? "updated" : "created"}.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/admin-api/subscriptions"] });
      onClose();
    } catch (error) {
      console.error("Error submitting subscription:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} subscription. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subscription" : "Add New Subscription"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the subscription details below."
              : "Enter the details for the new subscription."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="organizationId" className="text-right">
                Organization
              </Label>
              <Select
                value={formData.organizationId.toString()}
                onValueChange={(value) => handleSelectChange("organizationId", value)}
                disabled={isEditing}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="plan" className="text-right">
                Plan
              </Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => handleSelectChange("plan", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="billingInterval" className="text-right">
                Billing Interval
              </Label>
              <Select
                value={formData.billingInterval}
                onValueChange={(value) => handleSelectChange("billingInterval", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentPeriodStart" className="text-right">
                Period Start
              </Label>
              <Input
                id="currentPeriodStart"
                name="currentPeriodStart"
                type="date"
                value={formData.currentPeriodStart}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currentPeriodEnd" className="text-right">
                Period End
              </Label>
              <Input
                id="currentPeriodEnd"
                name="currentPeriodEnd"
                type="date"
                value={formData.currentPeriodEnd}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="currency" className="text-right">
                Currency
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleSelectChange("currency", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cancelAtPeriodEnd" className="text-right">
                Cancel at Period End
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox
                  id="cancelAtPeriodEnd"
                  checked={formData.cancelAtPeriodEnd}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange("cancelAtPeriodEnd", checked as boolean)
                  }
                />
                <Label htmlFor="cancelAtPeriodEnd">Yes</Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SubscriptionsPanel = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  // Fetch subscriptions data
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["/admin-api/subscriptions"],
  });

  // Handle adding a new subscription
  const handleAddSubscription = () => {
    setSelectedSubscription(null);
    setShowDialog(true);
  };

  // Handle editing a subscription
  const handleEditSubscription = (subscription: any) => {
    setSelectedSubscription(subscription);
    setShowDialog(true);
  };

  // Handle canceling a subscription
  const handleCancelSubscription = async (subscription: any) => {
    try {
      const response = await fetch(`/admin-api/subscriptions/${subscription.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to cancel subscription");

      toast({
        title: "Subscription canceled",
        description: `The subscription has been marked for cancellation at the end of the billing period.`,
      });

      // Refresh data
      refetch();
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Format price
  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Filter subscriptions based on search query
  const filteredSubscriptions = data.filter((subscription: any) => {
    if (!searchQuery) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(" ");
    const subscriptionData = `${subscription.organization?.name || ""} ${subscription.plan} ${subscription.status}`.toLowerCase();
    
    return searchTerms.every((term) => subscriptionData.includes(term));
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle>Subscriptions & Billing</CardTitle>
              <CardDescription>Manage organization subscriptions and billing</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleAddSubscription}>
                <Plus className="mr-2 h-4 w-4" />
                Add Subscription
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="h-4 w-4 mr-2 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="py-8 text-center text-red-500">
              Error loading subscriptions. Please try again.
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all subscriptions.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Billing Interval</TableHead>
                  <TableHead>Current Period</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      {searchQuery
                        ? "No subscriptions match your search criteria."
                        : "No subscriptions found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((subscription: any) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {subscription.organization?.name || "Unknown Organization"}
                      </TableCell>
                      <TableCell>
                        <PlanBadge plan={subscription.plan} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={subscription.status} />
                        {subscription.cancelAtPeriodEnd && (
                          <Badge variant="outline" className="ml-2">
                            Canceling
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{subscription.billingInterval}</TableCell>
                      <TableCell>
                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        {formatPrice(subscription.price, subscription.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditSubscription(subscription)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.location.href = `/admin/organizations/${subscription.organizationId}/invoices`}
                            >
                              View Invoices
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!subscription.cancelAtPeriodEnd && subscription.status !== "canceled" ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleCancelSubscription(subscription)}
                              >
                                Cancel
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredSubscriptions.length} of {data.length} subscriptions
          </div>
        </CardFooter>
      </Card>

      {showDialog && (
        <SubscriptionDialog
          subscription={selectedSubscription}
          onClose={() => setShowDialog(false)}
          isOpen={showDialog}
        />
      )}
    </>
  );
};

export default SubscriptionsPanel;